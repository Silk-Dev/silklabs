/**
 * v0.3.0 Thesis Test — Proof Drives Matching (FULL)
 *
 * Maya claims software engineer (base → software). She uploads ONLY
 * culinary proofs. After reality_vector recomputation, her alignment
 * with a restaurant project must STRICTLY OUTRANK a software project.
 *
 * This is the gate. Shift is the precondition, ranking is the thesis.
 *
 * Run: source ~/.nvm/nvm.sh && nvm use && DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx tsx scripts/manual/test_thesis.ts
 */

import { prisma } from "@/lib/prisma"
import { ingestProofOfWork, calculateRealityIndex } from "@/lib/ingestion.service"
import { computeAlignment, getCosineDistance } from "@/lib/alignment.service"

async function main() {
  console.log("=== v0.3.0 THESIS TEST (FULL) ===\n")

  // ── 1. Get Maya ──
  const user = await prisma.user.findFirst({ where: { email: "maya@example.com" } })
  if (!user) { console.error("No test user"); process.exit(1) }
  console.log(`User: ${user.name} (${user.id.slice(0, 12)}...)`)

  let twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  })
  if (!twin) { console.error("No TwinVector"); process.exit(1) }
  const baseEmb: number[] = JSON.parse(twin.embedding || "[]")
  console.log(`Base embedding dims: ${baseEmb.length}`)

  // ── 2. Clean slate — delete all Maya's proofs ──
  await prisma.proofOfWork.deleteMany({ where: { ownerType: "USER", ownerId: user.id } })

  // ── 3. Ingest IMAGE proof — real dish photo ──
  console.log("\n--- IMAGE: Dish photo ---")
  const imgResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "IMAGE",
    source: "test_data/dish_real.jpg",
    title: "Gourmet dish",
    tags: ["culinary", "gourmet", "cooking"],
  })
  console.log(`  Caption: ${imgResult.extractedText}`)
  console.log(`  Confidence: ${imgResult.confidenceScore}`)
  if (imgResult.extractedText.startsWith("Image:")) {
    console.log("  FATAL: filename fallback — vit-gpt2 not used. Test invalid.")
    process.exit(1)
  }

  // ── 4. Ingest TEXT proofs (culinary only) ──
  console.log("\n--- TEXT: Restaurant management ---")
  const restResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "TEXT",
    source: "Standard operating procedures for upscale dining establishments. Kitchen workflow optimization, inventory management for fresh seasonal ingredients, wine pairing selections for prix fixe menus, staff scheduling for dinner service, customer satisfaction metrics, plating presentation standards, service timing precision, sourcing from local farms and purveyors. Emergency procedures for kitchen fires and health inspection preparation.",
    title: "Restaurant Management SOP",
    tags: ["restaurant", "hospitality", "management", "culinary"],
  })
  console.log(`  Confidence: ${restResult.confidenceScore}`)

  console.log("\n--- TEXT: Culinary techniques ---")
  const cookResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "TEXT",
    source: "Advanced culinary techniques including sous-vide cooking at precise temperatures, emulsion stabilization for sauces, knife skills for vegetable fabrication, pastry lamination for croissants and puff pastry, fermentation for bread and pickled vegetables, and flavor profiling through the five taste dimensions. Experience with French, Italian, and Japanese cuisine traditions.",
    title: "Culinary techniques portfolio",
    tags: ["culinary", "cooking", "techniques", "gourmet"],
  })
  console.log(`  Confidence: ${cookResult.confidenceScore}`)

  // ── 5. Recompute Reality Index ──
  console.log("\n--- Reality Index ---")
  const reality = await calculateRealityIndex(user.id)
  console.log(`  Assets: ${reality.assetCount}`)
  console.log(`  Score: ${reality.realityScore}`)

  // Measure shift
  const dot = baseEmb.reduce((s, v, i) => s + v * reality.realityVector[i], 0)
  const nA = Math.sqrt(baseEmb.reduce((s, v) => s + v * v, 0))
  const nB = Math.sqrt(reality.realityVector.reduce((s, v) => s + v * v, 0))
  const shift = 1 - dot / (nA * nB)
  console.log(`  Base→Reality shift: ${shift.toFixed(4)}`)

  // ── 6. Create test project twin embeddings ──
  // Generate restaurant and software embeddings from descriptive text
  const { pipeline } = await import("@xenova/transformers")
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")

  const embedText = async (text: string): Promise<string> => {
    const r = await embedder(text, { pooling: "mean", normalize: true })
    return JSON.stringify(Array.from((r as any).data as Float32Array))
  }

  const restaurantEmb = await embedText(
    "Restaurant and food service business. Menu planning, kitchen operations, " +
    "ingredient sourcing, customer dining experience, wine pairing, culinary " +
    "team management, health code compliance, food cost optimization."
  )
  const softwareEmb = await embedText(
    "Software engineering and technology. Full-stack web development, cloud " +
    "infrastructure, API design, database architecture, CI/CD pipelines, " +
    "agile methodology, system design, code review."
  )

  // Upsert test twin vectors for two projects
  const makeProjectTwin = async (ownerId: string, emb: string) => {
    const existing = await prisma.twinVector.findFirst({
      where: { ownerType: "PROJECT", ownerId },
    })
    if (existing) {
      // Update embedding
      await prisma.twinVector.update({
        where: { id: existing.id },
        data: { embedding: emb },
      })
      // Also update raw pgvector column
      await prisma.$executeRawUnsafe(
        `UPDATE "twin_vectors" SET "embedding_vector" = $1::vector WHERE "id" = $2`,
        emb, existing.id,
      )
      return existing.id
    }
    const created = await prisma.twinVector.create({
      data: {
        ownerType: "PROJECT",
        ownerId,
        embedding: emb,
        twinProfile: { skills: [] },
        preferences: {},
        lastSyncedAt: new Date(),
      },
    })
    await prisma.$executeRawUnsafe(
      `UPDATE "twin_vectors" SET "embedding_vector" = $1::vector WHERE "id" = $2`,
      emb, created.id,
    )
    return created.id
  }

  // Use the existing seed projects: Harbor CLI (software) and OpenFeedback (software-like)
  // Create a virtual restaurant project for comparison
  const softwareProjectId = "cmrh964do000jb27zcnksrioo" // Harbor CLI
  const restaurantProjectId = "restaurant-thesis-test"   // virtual ID for test

  await makeProjectTwin(softwareProjectId, softwareEmb)
  await makeProjectTwin(restaurantProjectId, restaurantEmb)

  // ── 7. Compute alignment scores ──
  console.log("\n--- Alignment Scores ---")

  // Maya's full twin
  twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  })
  if (!twin) { console.error("Lost twin"); process.exit(1) }

  const swTwin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "PROJECT", ownerId: softwareProjectId } },
  })
  const restTwin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "PROJECT", ownerId: restaurantProjectId } },
  })
  if (!swTwin || !restTwin) { console.error("Missing project twins"); process.exit(1) }

  const softAlign = await computeAlignment(twin, swTwin)
  const restAlign = await computeAlignment(twin, restTwin)

  console.log(`  Software project (Harbor CLI):  overall=${softAlign.overallScore.toFixed(4)}  skill=${softAlign.skillScore.toFixed(4)}`)
  console.log(`  Restaurant project (test):       overall=${restAlign.overallScore.toFixed(4)}  skill=${restAlign.skillScore.toFixed(4)}`)

  // ── 8. THE GATE ──
  console.log("\n=== GATE — RANKING ===")
  const restaurantWins = restAlign.overallScore > softAlign.overallScore
  if (restaurantWins) {
    console.log(`✓ THESIS PASSED`)
    console.log(`  Restaurant (${restAlign.overallScore.toFixed(4)}) > Software (${softAlign.overallScore.toFixed(4)})`)
    console.log(`  Culinary proofs shifted reality_vector by ${shift.toFixed(4)} from base`)
    console.log(`  Ranking reflects evidence, not claims.`)
  } else {
    console.log(`✗ THESIS FAILED`)
    console.log(`  Software (${softAlign.overallScore.toFixed(4)}) >= Restaurant (${restAlign.overallScore.toFixed(4)})`)
    console.log(`  Shift was ${shift.toFixed(4)} but not enough to flip ranking.`)
    console.log(`  Confidence scores may need adjustment.`)
  }

  // Cleanup: remove the virtual restaurant twin
  if (restTwin) {
    await prisma.twinVector.delete({ where: { id: restTwin.id } }).catch(() => {})
  }

  console.log("\nProof confidences:", [imgResult.confidenceScore, restResult.confidenceScore, cookResult.confidenceScore])
  await prisma.$disconnect()
  process.exit(restaurantWins ? 0 : 1)
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1) })
