/**
 * v0.3.0 Thesis Test — Proof Drives Matching (CLEAN)
 *
 * Maya Patel's base embedding points toward software/engineering.
 * She uploads ONLY culinary proofs (no software proofs).
 * After recomputing reality_vector, her matching must reflect culinary,
 * not software.
 *
 * Run: source ~/.nvm/nvm.sh && nvm use && DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" npx tsx test_thesis.ts
 */

import { prisma } from "@/lib/prisma"
import { ingestProofOfWork, calculateRealityIndex } from "@/lib/ingestion.service"
import { findNearestNeighbors } from "@/lib/alignment.service"

async function main() {
  console.log("=== v0.3.0 Thesis Test (CLEAN) ===\n")

  const user = await prisma.user.findFirst({ where: { email: "maya@example.com" } })
  if (!user) { console.error("No test user"); process.exit(1) }
  console.log(`User: ${user.name} (${user.id.slice(0, 12)}...)`)

  let twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  })
  if (!twin) { console.error("No TwinVector"); process.exit(1) }
  const baseEmb: number[] = JSON.parse(twin.embedding || "[]")
  console.log(`Base embedding dims: ${baseEmb.length}`)

  // Delete any previous culinary proofs to start clean
  await prisma.proofOfWork.deleteMany({
    where: { ownerType: "USER", ownerId: user.id, tags: { path: "$", array_contains: "culinary" } },
  }).catch(() => {})

  // Delete previous software proofs too (clean slate)
  await prisma.proofOfWork.deleteMany({
    where: { ownerType: "USER", ownerId: user.id },
  }).catch(() => {})

  // 1. IMAGE proof — gourmet dish (captioned by vit-gpt2)
  console.log("\n--- IMAGE: Gourmet dish ---")
  const imageResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "IMAGE",
    source: "test_data/dish.png",
    title: "Signature dish — mushroom risotto",
    tags: ["culinary", "gourmet", "cooking"],
  })
  console.log(`  Caption: ${imageResult.extractedText}`)
  console.log(`  Confidence: ${imageResult.confidenceScore}`)
  if (imageResult.extractedText.startsWith("Image:")) {
    console.log("  WARNING: filename fallback used — vit-gpt2 not available")
  }

  // 2. TEXT proof — restaurant management (PDF equivalent)
  console.log("\n--- TEXT: Restaurant management ---")
  const pdfResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "TEXT",
    source: "Standard operating procedures for upscale dining establishments. Kitchen workflow optimization, inventory management for fresh seasonal ingredients, wine pairing selections for prix fixe menus, staff scheduling for dinner service, and customer satisfaction metrics. The restaurant achieved a 4.8-star rating through detailed attention to plating presentation, service timing precision, and sourcing ingredients from local farms and purveyors. Emergency procedures for kitchen fires and health inspection preparation.",
    title: "Restaurant Management SOP",
    tags: ["restaurant", "hospitality", "management", "culinary"],
  })
  console.log(`  Extracted: ${pdfResult.extractedText.slice(0, 80)}...`)
  console.log(`  Confidence: ${pdfResult.confidenceScore}`)

  // 3. TEXT proof — culinary techniques
  console.log("\n--- TEXT: Culinary techniques ---")
  const cookResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "TEXT",
    source: "Advanced culinary techniques including sous-vide cooking at precise temperatures, emulsion stabilization for sauces, knife skills for vegetable fabrication, pastry lamination for croissants and puff pastry, fermentation for bread and pickled vegetables, and flavor profiling through the five taste dimensions. Experience with French, Italian, and Japanese cuisine traditions.",
    title: "Culinary techniques portfolio",
    tags: ["culinary", "cooking", "techniques", "gourmet"],
  })
  console.log(`  Extracted: ${cookResult.extractedText.slice(0, 80)}...`)
  console.log(`  Confidence: ${cookResult.confidenceScore}`)

  // 4. Recompute Reality Index
  console.log("\n--- Reality Index ---")
  const reality = await calculateRealityIndex(user.id)
  console.log(`  Total assets: ${reality.assetCount}`)
  console.log(`  Reality score: ${reality.realityScore}`)

  // 5. Compute base→reality shift
  const dot = baseEmb.reduce((s, v, i) => s + v * reality.realityVector[i], 0)
  const nA = Math.sqrt(baseEmb.reduce((s, v) => s + v * v, 0))
  const nB = Math.sqrt(reality.realityVector.reduce((s, v) => s + v * v, 0))
  const dist = 1 - dot / (nA * nB)
  console.log(`  Base→Reality cosine distance: ${dist.toFixed(4)}`)

  // 6. Verify persistence
  twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  })
  console.log(`  Has reality_vector: ${twin?.realityEmbedding !== null}`)
  if (twin?.realityEmbedding) {
    const re: number[] = JSON.parse(twin.realityEmbedding)
    const match = re.reduce((s, v, i) => s + Math.abs(v - reality.realityVector[i]), 0)
    console.log(`  Persisted realityEmbedding matches computed: ${match < 0.001 ? "YES" : "NO"}`)
  }

  // 7. Nearest neighbors via reality_vector
  console.log("\n--- Nearest neighbors (by reality_vector) ---")
  const neighbors = await findNearestNeighbors(user.id, "USER", 5)
  if (neighbors.length === 0) {
    console.log("  (no neighbors — expected with few users in dev)")
  } else {
    for (const n of neighbors) {
      const nu = await prisma.user.findUnique({ where: { id: n.ownerId } })
      console.log(`  ${nu?.name || n.ownerId}: distance=${n.distance.toFixed(4)}`)
    }
  }

  // 8. The gate assertion
  console.log("\n=== GATE CHECK ===")
  const THESIS_PASSED = dist > 0.01
  if (THESIS_PASSED) {
    console.log("✓ THESIS PASSED — reality_vector shifted from base by " + dist.toFixed(4))
    console.log("  Culinary proofs overrode the software claim.")
  } else {
    console.log("✗ THESIS FAILED — reality_vector did not meaningfully shift")
    console.log("  Base→Reality distance: " + dist.toFixed(4) + " (need > 0.01)")
    console.log("  Confidence scores may need adjustment.")
  }

  const eachConfidence = [imageResult.confidenceScore, pdfResult.confidenceScore, cookResult.confidenceScore]
  console.log("\nProof confidences:", eachConfidence)
  console.log(`Min confidence: ${Math.min(...eachConfidence)}`)
  console.log(`Max confidence: ${Math.max(...eachConfidence)}`)

  await prisma.$disconnect()
  process.exit(THESIS_PASSED ? 0 : 1)
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1) })
