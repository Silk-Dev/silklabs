import { prisma } from "@/lib/prisma"
import { pipeline, RawImage } from "@xenova/transformers"
import type { PipelineType } from "@xenova/transformers/types/pipelines"

// ---------------------------------------------------------------------------
// Lazy-loaded pipelines (singletons)
// ---------------------------------------------------------------------------
let embedder: any = null
let captioner: any = null
let captionerLoadAttempted = false

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }
  return embedder
}

async function getCaptioner() {
  if (!captioner && !captionerLoadAttempted) {
    captionerLoadAttempted = true
    try {
      // vit-gpt2-image-captioning (~600MB). On first load in production,
      // this downloads and caches in ~/.cache/huggingface/.
      // Greedy decoding (do_sample=false) ensures deterministic captions.
      captioner = await pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning")
    } catch (e: any) {
      console.warn("Vision caption model unavailable, using filename fallback:", e.message?.slice(0, 100))
      captioner = null
    }
  }
  return captioner
}

// ---------------------------------------------------------------------------
// IMAGE captioning
// ---------------------------------------------------------------------------

/**
 * Caption an image. Uses vit-gpt2 with greedy decoding (deterministic).
 * Falls back to a deterministic filename-derived caption if the model is
 * unavailable (e.g. during first deploy before model cache warms).
 *
 * The caption is then embedded with the same MiniLM pipeline as text proofs,
 * keeping the entire Reality Index in one 384-dim space.
 */
async function captionImage(source: string): Promise<string> {
  const capper = await getCaptioner()
  if (capper) {
    let img
    if (source.startsWith("http://") || source.startsWith("https://")) {
      img = await RawImage.read(source)
    } else {
      // Read from file path or base64
      const path = require("path")
      const filePath = path.resolve(process.cwd(), source)
      img = await RawImage.read(filePath)
    }
    const result = await capper(img, { do_sample: false, max_new_tokens: 30 })
    const text = result?.[0]?.generated_text
    if (text && text.trim().length > 0) return text.trim().slice(0, 500)
  }

  // Deterministic fallback: extract filename from path/URL
  const parts = source.replace(/\\/g, "/").split("/").filter(Boolean)
  const filename = parts[parts.length - 1] || "image"
  const name = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")
  return `Image: ${name || filename}`
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

async function extractFromPdf(source: string): Promise<string> {
  // pdf-parse returns content as Buffer, we load it dynamically
  const pdfParse = await import("pdf-parse")
  let dataBuffer: Buffer
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const resp = await fetch(source, { signal: AbortSignal.timeout(15_000) })
    if (!resp.ok) throw new Error(`PDF fetch failed: ${resp.status}`)
    dataBuffer = Buffer.from(await resp.arrayBuffer())
  } else if (source.startsWith("data:")) {
    const base64 = source.split(",")[1] || source
    dataBuffer = Buffer.from(base64, "base64")
  } else {
    // Assume file path
    const fs = await import("fs")
    dataBuffer = fs.readFileSync(source)
  }
  const data = await (pdfParse as any).default(dataBuffer)
  const text = (data.text || "").replace(/\s+/g, " ").trim().slice(0, 10_000)
  if (text.length < 20) {
    console.warn(`PDF contained minimal extractable text (${text.length} chars). May be scanned/image-based.`)
  }
  return text
}

// ---------------------------------------------------------------------------
// URL / TEXT extraction (unchanged)
// ---------------------------------------------------------------------------

async function extractFromUrl(url: string): Promise<string> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "SilkLabs/1.0" },
  })
  if (!resp.ok) throw new Error(`URL fetch failed: ${resp.status} ${resp.statusText}`)
  const html = await resp.text()
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length < 50) throw new Error("Extracted content too short — page may be JS-rendered")
  return text.slice(0, 10_000)
}

function extractFromText(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, 10_000)
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const e = await getEmbedder()
  const result = await e(text, { pooling: "mean", normalize: true })
  return Array.from((result as any).data as Float32Array)
}

// ---------------------------------------------------------------------------
// Confidence Scoring (unchanged)
// ---------------------------------------------------------------------------

/**
 * Computes confidence score from the extracted text's evidentiary strength,
 * independent of the user's claimed domain.
 *
 * The purpose: a proof that contradicts the user's claimed domain (e.g.,
 * culinary proof for a software engineer) must NOT be down-weighted —
 * it should be weighted by how strong the evidence is on its own terms.
 *
 * Thresholds (deterministic, no randomness):
 *   >= 200 chars with specific content → 0.9  (strong evidence)
 *   >= 50 chars of coherent content    → 0.6  (moderate evidence)
 *   < 50 chars / trivial               → 0.2  (weak evidence)
 *
 * For IMAGE: confidence reflects caption specificity (concrete content words
 * beyond generic terms). "a plate of food with vegetables" → 0.9 (specific,
 * has domain terms). "a close up of a red and white object" → 0.6 (generic).
 * Filename fallback → 0.2.
 */
export function computeConfidenceScore(
  extractedText: string,
  assetType: string,
): number {
  const text = extractedText.trim()

  // IMAGE: specificity-based
  if (assetType === "IMAGE") {
    if (text.startsWith("Image:")) return 0.2 // filename fallback
    // Count concrete content words beyond generic caption stock
    const genericWords = new Set([
      "a", "an", "the", "of", "with", "in", "on", "at", "to", "for",
      "is", "are", "this", "that", "it", "its", "and", "or",
      "close", "up", "photo", "image", "picture", "view", "shot",
      "look", "looking", "seen", "showing", "taken",
    ])
    const words = text.toLowerCase()
      .replace(/[^a-z ]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !genericWords.has(w))
    if (words.length >= 3) return 0.9  // specific caption with domain terms
    if (words.length >= 1) return 0.6  // somewhat specific
    return 0.2  // fully generic
  }

  // For TEXT/PDF/URL: length-based strength
  if (text.length >= 200) return 0.9
  if (text.length >= 50) return 0.6
  return 0.2
}

// ---------------------------------------------------------------------------
// Main Ingestion
// ---------------------------------------------------------------------------

export interface IngestionInput {
  ownerType: "USER" | "PROJECT"
  ownerId: string
  assetType: "URL" | "TEXT" | "IMAGE" | "PDF"
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
 * Ingests a ProofOfWork:
 *   URL   → fetch + strip HTML → embed
 *   TEXT  → clean + embed
 *   IMAGE → caption (vit-gpt2, greedy) → embed caption
 *   PDF   → extract text (pdf-parse) → embed
 *
 * All produce 384-dim embeddings in the same space via MiniLM.
 */
export async function ingestProofOfWork(input: IngestionInput): Promise<IngestionResult> {
  // 1. Extract text based on asset type
  let extractedText: string

  switch (input.assetType) {
    case "URL":
      extractedText = await extractFromUrl(input.source)
      break
    case "TEXT":
      extractedText = extractFromText(input.source)
      break
    case "IMAGE":
      extractedText = await captionImage(input.source)
      break
    case "PDF":
      extractedText = await extractFromPdf(input.source)
      break
    default:
      throw new Error(`Unsupported asset type: ${input.assetType}`)
  }

  // 2. Generate embedding
  const embedding = await generateEmbedding(extractedText)

  // 3. Compute confidence from evidentiary strength (independent of claimed domain)
  const confidenceScore = computeConfidenceScore(extractedText, input.assetType)

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

  // 5. Store vector in the raw pgvector column
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
// REALITY INDEX
// ============================================================================

/**
 * RealityVector = normalize(BaseVector * 0.4 + Σ(AssetVector * confidence * 0.6 / N))
 * N=0 → RealityVector = BaseVector
 */
export async function calculateRealityIndex(userId: string): Promise<{
  realityVector: number[]
  realityScore: number
  baseEmbedding: number[]
  assetCount: number
}> {
  const twinVector = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
  })
  if (!twinVector || !twinVector.embedding) {
    throw new Error(`No base TwinVector found for user ${userId}`)
  }

  const baseEmbedding: number[] = JSON.parse(twinVector.embedding)

  const proofs = await prisma.proofOfWork.findMany({
    where: { ownerType: "USER", ownerId: userId },
    select: { embedding: true, confidenceScore: true },
  })

  const N = proofs.length

  if (N === 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "twin_vectors" SET "reality_vector" = $1::vector, "realityEmbedding" = $2, "realityScore" = $3 WHERE "id" = $4`,
      JSON.stringify(baseEmbedding),
      JSON.stringify(baseEmbedding),
      0.0,
      twinVector.id,
    )
    return { realityVector: baseEmbedding, realityScore: 0.0, baseEmbedding, assetCount: 0 }
  }

  const dims = baseEmbedding.length
  const realityVector = new Array(dims).fill(0)
  for (let i = 0; i < dims; i++) realityVector[i] = baseEmbedding[i] * 0.4

  let totalConfidenceWeight = 0
  for (const proof of proofs) {
    if (!proof.embedding) continue
    const assetEmbedding: number[] = JSON.parse(proof.embedding)
    const weight = (proof.confidenceScore * 0.6) / N
    totalConfidenceWeight += proof.confidenceScore
    for (let i = 0; i < dims; i++) realityVector[i] += assetEmbedding[i] * weight
  }

  const realityScore = totalConfidenceWeight / N
  const magnitude = Math.sqrt(realityVector.reduce((s, v) => s + v * v, 0))
  if (magnitude > 0) for (let i = 0; i < dims; i++) realityVector[i] /= magnitude

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
