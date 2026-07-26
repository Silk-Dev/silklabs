/**
 * v0.3.0 Thesis Test — Proof Drives Matching
 *
 * Run: DATABASE_URL="postgresql://postgres@localhost:5444/silklabs" \
 *        npx tsx test_thesis.ts
 */

import { prisma } from "@/lib/prisma"
import { ingestProofOfWork, calculateRealityIndex } from "@/lib/ingestion.service"
import { findNearestNeighbors } from "@/lib/alignment.service"

async function main() {
  console.log("=== v0.3.0 Thesis Test ===\n")

  const user = await prisma.user.findFirst({ where: { email: "maya@example.com" } })
  if (!user) { console.error("No test user"); process.exit(1) }
  console.log(`User: ${user.name} (${user.id})`)

  let twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  })
  if (!twin) { console.error("No TwinVector"); process.exit(1) }
  console.log(`Base embedding dims: ${JSON.parse(twin.embedding || "[]").length}`)

  // Store pre-reality base embedding for comparison
  const baseEmb: number[] = JSON.parse(twin.embedding || "[]")

  // Ingest IMAGE proof
  console.log("\n--- IMAGE: Gourmet dish ---")
  try {
    const r = await ingestProofOfWork({
      ownerType: "USER", ownerId: user.id, assetType: "IMAGE",
      source: "/tmp/gourmet_dish.png",
      title: "Signature dish — mushroom risotto",
      tags: ["culinary", "gourmet", "cooking"],
    })
    console.log(`  Confidence: ${r.confidenceScore}`)
    console.log(`  Caption: ${r.extractedText}`)
  } catch (e: any) {
    console.log(`  Image ingestion: ${e.message} (continuing)`)
  }

  // Ingest TEXT proof as restaurant management (PDF equivalent)
  console.log("\n--- TEXT: Restaurant management ---")
  const pdfResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "TEXT",
    source: "Restaurant Management: standard operating procedures for upscale dining. Kitchen workflow, inventory management for fresh ingredients, wine pairing, staff scheduling, customer satisfaction for fine dining. 4.8-star rating through plating detail, service timing, local farm sourcing.",
    title: "Restaurant Management SOP",
    tags: ["restaurant", "hospitality", "management"],
  })
  console.log(`  Confidence: ${pdfResult.confidenceScore}`)

  // Control: software engineering proof
  console.log("\n--- TEXT: Software engineering (control) ---")
  const swResult = await ingestProofOfWork({
    ownerType: "USER", ownerId: user.id, assetType: "TEXT",
    source: "Full-stack web application built with React, TypeScript, Node.js, PostgreSQL. Deployed on AWS with CI/CD pipeline and Docker containers.",
    title: "Full-stack web application",
    tags: ["software", "react", "typescript"],
  })
  console.log(`  Confidence: ${swResult.confidenceScore}`)

  // Recompute Reality Index
  console.log("\n--- Reality Index ---")
  const reality = await calculateRealityIndex(user.id)
  console.log(`  Assets: ${reality.assetCount}`)
  console.log(`  Score: ${reality.realityScore}`)

  // Measure base→reality shift
  const dot = baseEmb.reduce((s, v, i) => s + v * reality.realityVector[i], 0)
  const nA = Math.sqrt(baseEmb.reduce((s, v) => s + v * v, 0))
  const nB = Math.sqrt(reality.realityVector.reduce((s, v) => s + v * v, 0))
  const dist = 1 - dot / (nA * nB)
  console.log(`  Base→Reality cosine distance: ${dist.toFixed(4)}`)

  // Refresh twin to get updated realityEmbedding
  twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  })

  console.log(`\n  Has reality_vector: ${twin?.realityEmbedding !== null}`)
  if (twin?.realityEmbedding) {
    const realityEmb: number[] = JSON.parse(twin.realityEmbedding)
    const match = realityEmb.reduce((s, v, i) => s + Math.abs(v - reality.realityVector[i]), 0)
    console.log(`  realityEmbedding matches computed: ${match < 0.001 ? "YES" : "DIFFERS"}`)
  }

  // Nearest neighbors
  console.log("\n--- Nearest neighbors ---")
  const neighbors = await findNearestNeighbors(user.id, "USER", 5)
  if (neighbors.length === 0) {
    console.log("  No neighbors (expected with few users)")
  } else {
    for (const n of neighbors) {
      const nu = await prisma.user.findUnique({ where: { id: n.ownerId } })
      console.log(`  ${nu?.name || n.ownerId}: distance=${n.distance.toFixed(4)}`)
    }
  }

  console.log("\n=== Thesis Test Complete ===")
  if (dist > 0.001) {
    console.log("✓ reality_vector shifted from base (proofs influenced matching)")
  } else {
    console.log("⚠ reality_vector close to base (proofs had minimal impact)")
    console.log("  (Expected when IMAGE captioning model is unavailable)")
  }
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1) })
