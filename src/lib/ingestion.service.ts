import { prisma } from "@/lib/prisma"
import { pipeline } from "@xenova/transformers"

// ---------------------------------------------------------------------------
// Lazy-loaded embedding pipeline (singleton across the service)
// ---------------------------------------------------------------------------
let embedder: any = null

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }
  return embedder
}

// ---------------------------------------------------------------------------
// Text Extraction
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and extracts readable body text.
 * Uses basic regex-based stripping (no cheerio dependency required).
 */
async function extractFromUrl(url: string): Promise<string> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "SilkLabs/1.0" },
  })
  if (!resp.ok) throw new Error(`URL fetch failed: ${resp.status} ${resp.statusText}`)

  const html = await resp.text()

  // Strip <script>, <style>, and HTML tags; collapse whitespace
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (text.length < 50) throw new Error("Extracted content too short — page may be JS-rendered")
  return text.slice(0, 10_000) // Cap at 10k chars for embedding
}

/**
 * Cleans and normalizes raw text input.
 */
function extractFromText(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10_000)
}

// ---------------------------------------------------------------------------
// Embedding Generation
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const embedder = await getEmbedder()
  const result = await embedder(text, { pooling: "mean", normalize: true })
  return Array.from((result as any).data as Float32Array)
}

// ---------------------------------------------------------------------------
// Confidence Scoring
// ---------------------------------------------------------------------------

/**
 * Computes confidence score by comparing an asset embedding against the user's
 * base TwinVector embedding using cosine similarity.
 *
 * Thresholds (deterministic, no randomness):
 *   > 0.7  → 0.9  (strong proof)
 *   0.4–0.7 → 0.6  (moderate proof)
 *   < 0.4  → 0.2  (weak proof / irrelevant)
 */
export function computeConfidenceScore(
  assetEmbedding: number[],
  baseEmbedding: number[],
): number {
  const dot = assetEmbedding.reduce((sum, v, i) => sum + v * baseEmbedding[i], 0)
  const normA = Math.sqrt(assetEmbedding.reduce((s, v) => s + v * v, 0))
  const normB = Math.sqrt(baseEmbedding.reduce((s, v) => s + v * v, 0))
  const similarity = dot / (normA * normB)

  if (similarity > 0.7) return 0.9
  if (similarity >= 0.4) return 0.6
  return 0.2
}

// ---------------------------------------------------------------------------
// Main Ingestion Entry Point
// ---------------------------------------------------------------------------

export interface IngestionInput {
  ownerType: "USER" | "PROJECT"
  ownerId: string
  assetType: "URL" | "TEXT"
  source: string
  title?: string
  tags?: string[]
}

export interface IngestionResult {
  proofId: string
  extractedText: string
  embedding: number[]
  confidenceScore: number
}

/**
 * Ingests a ProofOfWork: extracts text, generates embedding, computes
 * confidence score, and persists to the database.
 */
export async function ingestProofOfWork(input: IngestionInput): Promise<IngestionResult> {
  if (input.assetType !== "URL" && input.assetType !== "TEXT") {
    throw new Error(
      `Unsupported asset type for this milestone: ${input.assetType}. Only URL and TEXT are supported in v0.3.0-alpha.`,
    )
  }

  // 1. Extract semantic text
  const extractedText =
    input.assetType === "URL"
      ? await extractFromUrl(input.source)
      : extractFromText(input.source)

  // 2. Generate embedding
  const embedding = await generateEmbedding(extractedText)

  // 3. Fetch user's base TwinVector for confidence scoring
  const twinVector = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: input.ownerType, ownerId: input.ownerId } },
  })

  let confidenceScore = 0.5 // default (no base embedding available)
  if (twinVector?.embedding) {
    try {
      const baseEmbedding = JSON.parse(twinVector.embedding) as number[]
      if (baseEmbedding.length === embedding.length) {
        confidenceScore = computeConfidenceScore(embedding, baseEmbedding)
      }
      // If dimensions don't match, leave at default 0.5
    } catch {
      // If parsing fails, leave at default 0.5
    }
  }

  // 4. Persist
  const proof = await prisma.proofOfWork.create({
    data: {
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      assetType: input.assetType,
      source: input.source,
      extractedText,
      embedding: JSON.stringify(embedding),
      confidenceScore,
      title: input.title ?? null,
      tags: input.tags ?? [],
      processedAt: new Date(),
    },
  })

  // 5. Store vector in the raw column
  await prisma.$executeRawUnsafe(
    `UPDATE "proofs_of_work" SET "embedding_vector" = $1::vector WHERE "id" = $2`,
    JSON.stringify(embedding),
    proof.id,
  )

  return {
    proofId: proof.id,
    extractedText: extractedText.slice(0, 200),
    embedding,
    confidenceScore,
  }
}

// ============================================================================
// DIRECTIVE 3: THE REALITY INDEX CALCULATION
// ============================================================================

/**
 * Calculates and persists the Reality Index for a user.
 *
 * Formula:
 *   RealityVector = (BaseVector * 0.4) + Σ(AssetVector * Asset.confidenceScore * 0.6 / N)
 *
 *   Where N is the number of proof-of-work assets. If N = 0, RealityVector = BaseVector.
 *
 * Returns the Reality Score (average confidence across all assets, 0.0–1.0).
 */
export async function calculateRealityIndex(userId: string): Promise<{
  realityVector: number[]
  realityScore: number
  baseEmbedding: number[]
  assetCount: number
}> {
  // 1. Fetch the user's base TwinVector
  const twinVector = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
  })
  if (!twinVector || !twinVector.embedding) {
    throw new Error(`No base TwinVector found for user ${userId}`)
  }

  const baseEmbedding: number[] = JSON.parse(twinVector.embedding)

  // 2. Fetch all their ProofOfWork assets with embeddings
  const proofs = await prisma.proofOfWork.findMany({
    where: { ownerType: "USER", ownerId: userId },
    select: { embedding: true, confidenceScore: true },
  })

  const N = proofs.length

  // 3. If no proofs, RealityVector = BaseVector
  if (N === 0) {
    // Store the base vector as reality vector too
    await prisma.$executeRawUnsafe(
      `UPDATE "twin_vectors" SET "reality_vector" = $1::vector, "realityEmbedding" = $2, "realityScore" = $3 WHERE "id" = $4`,
      JSON.stringify(baseEmbedding),
      JSON.stringify(baseEmbedding),
      0.0,
      twinVector.id,
    )

    return {
      realityVector: baseEmbedding,
      realityScore: 0.0,
      baseEmbedding,
      assetCount: 0,
    }
  }

  // 4. Calculate weighted average
  // RealityVector = (BaseVector * 0.4) + Σ(AssetVector * Asset.confidenceScore * 0.6 / N)
  const dims = baseEmbedding.length
  const realityVector = new Array(dims).fill(0)

  // Contribution from base: BaseVector * 0.4
  for (let i = 0; i < dims; i++) {
    realityVector[i] = baseEmbedding[i] * 0.4
  }

  // Contribution from assets: Sum of (AssetVector * Asset.confidenceScore * 0.6 / N)
  let totalConfidenceWeight = 0
  for (const proof of proofs) {
    if (!proof.embedding) continue
    const assetEmbedding: number[] = JSON.parse(proof.embedding)
    const weight = (proof.confidenceScore * 0.6) / N
    totalConfidenceWeight += proof.confidenceScore
    for (let i = 0; i < dims; i++) {
      realityVector[i] += assetEmbedding[i] * weight
    }
  }

  // 5. Reality Score: average confidence across all assets
  const realityScore = totalConfidenceWeight / N

  // 6. Normalize the reality vector (ensure it's still unit length for ANN queries)
  const magnitude = Math.sqrt(realityVector.reduce((s, v) => s + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < dims; i++) {
      realityVector[i] /= magnitude
    }
  }

  // 7. Persist
  await prisma.$executeRawUnsafe(
    `UPDATE "twin_vectors" SET "reality_vector" = $1::vector, "realityEmbedding" = $2, "realityScore" = $3 WHERE "id" = $4`,
    JSON.stringify(realityVector),
    JSON.stringify(realityVector),
    realityScore,
    twinVector.id,
  )

  return {
    realityVector,
    realityScore: Math.round(realityScore * 100) / 100,
    baseEmbedding,
    assetCount: N,
  }
}
