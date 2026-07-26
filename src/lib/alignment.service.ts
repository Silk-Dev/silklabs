import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// Alignment score computation
// ---------------------------------------------------------------------------

export async function computeAlignment(
  twinA: any,
  twinB: any,
): Promise<{
  overallScore: number
  skillScore: number
  valueScore: number
  constraintScore: number
  diversityBonus: number
  breakdown: any
}> {
  const skillScore = Math.max(0, 1 - await getCosineDistance(
    twinA.ownerId, twinA.ownerType,
    twinB.ownerId, twinB.ownerType,
  ))

  const hardResult = evaluateHardConstraints(twinA, twinB)
  const constraintScore = hardResult.passed ? 1.0 : 0.0

  const valueScore = computeValueOverlap(
    (twinA as any).twinProfile,
    (twinB as any).twinProfile,
  )

  const diversityBonus = Math.min(0.3, 1 - skillScore)

  const overallScore =
    skillScore * 0.35 +
    constraintScore * 0.25 +
    valueScore * 0.20 +
    diversityBonus * 0.20

  return {
    overallScore: Math.round(overallScore * 10000) / 10000,
    skillScore: Math.round(skillScore * 10000) / 10000,
    valueScore: Math.round(valueScore * 10000) / 10000,
    constraintScore: Math.round(constraintScore * 10000) / 10000,
    diversityBonus: Math.round(diversityBonus * 10000) / 10000,
    breakdown: {
      skillMatch: { score: skillScore, weight: 0.35 },
      constraintMatch: { passed: hardResult.passed, failures: hardResult.failures, score: constraintScore, weight: 0.25 },
      valueMatch: { score: valueScore, weight: 0.20 },
      diversityBonus: { value: diversityBonus, weight: 0.20 },
    },
  }
}

export function evaluateHardConstraints(
  twinA: any,
  twinB: any,
): { passed: boolean; failures: string[] } {
  const failures: string[] = []
  const profileA = (twinA as any).twinProfile || {}
  const profileB = (twinB as any).twinProfile || {}
  const prefsA = (twinA as any).preferences || {}
  const prefsB = (twinB as any).preferences || {}

  // Location: must be the same or one must be remote-friendly
  if (profileA.location && profileB.location) {
    const locA = profileA.location.toLowerCase().trim()
    const locB = profileB.location.toLowerCase().trim()
    if (locA !== locB && locA !== "remote" && locB !== "remote") {
      failures.push(`Location mismatch: ${profileA.location} vs ${profileB.location}`)
    }
  }

  // Commitment: must not exceed availability
  const commitmentOrder = ["part-time", "full-time"]
  const comA = prefsA.commitment?.toLowerCase().trim()
  const comB = prefsB.commitment?.toLowerCase().trim()
  if (comA && comB) {
    const idxA = commitmentOrder.indexOf(comA)
    const idxB = commitmentOrder.indexOf(comB)
    if (idxA >= 0 && idxB >= 0 && idxA > idxB) {
      failures.push(`Commitment mismatch: ${comA} vs ${comB}`)
    }
  }

  return { passed: failures.length === 0, failures }
}

export function computeValueOverlap(
  profileA: any,
  profileB: any,
): number {
  const skillsA: string[] = profileA?.skills || []
  const skillsB: string[] = profileB?.skills || []
  if (skillsA.length === 0 || skillsB.length === 0) return 0
  const setA = new Set(skillsA.map((s) => s.toLowerCase().trim()))
  const setB = new Set(skillsB.map((s) => s.toLowerCase().trim()))
  let intersection = 0
  for (const s of setA) if (setB.has(s)) intersection++
  const union = new Set([...setA, ...setB]).size
  return intersection / union
}

// ---------------------------------------------------------------------------
// Distance queries — now using reality_vector with fallback to embedding_vector
// ---------------------------------------------------------------------------

/**
 * Finds nearest neighbors by cosign distance.
 * Uses reality_vector if available, falls back to embedding_vector.
 * reality_vector is indexed via IVFFlat (idx_twin_vectors_reality).
 */
export async function findNearestNeighbors(
  ownerId: string,
  ownerType: "USER" | "PROJECT",
  limit = 10,
): Promise<{ ownerId: string; ownerType: string; distance: number }[]> {
  // Fetch the query twin's vectors
  const twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    select: { id: true, realityEmbedding: true, embedding: true },
  })
  if (!twin) return []

  // Determine which vector to use: reality_vector preferred, fallback to embedding
  const hasReality = twin.realityEmbedding !== null && twin.realityEmbedding !== undefined
  const vectorColumn = hasReality ? "reality_vector" : "embedding_vector"

  const rows = await prisma.$queryRawUnsafe<{ owner_id: string; owner_type: string; distance: number }[]>(
    `SELECT tv."ownerId" as owner_id, tv."ownerType" as owner_type,
            tv."${vectorColumn}" <=> (SELECT "${vectorColumn}" FROM "twin_vectors" WHERE "id" = $1) AS distance
     FROM "twin_vectors" tv
     WHERE tv."id" != $1
       AND tv."${vectorColumn}" IS NOT NULL
     ORDER BY distance ASC
     LIMIT ${limit}`,
    twin.id,
  )

  return rows.map((r) => ({
    ownerId: r.owner_id,
    ownerType: r.owner_type,
    distance: r.distance,
  }))
}

export async function getCosineDistance(
  idA: string,
  typeA: string,
  idB: string,
  typeB: string,
): Promise<number> {
  // Get both twins
  const [twinA, twinB] = await Promise.all([
    prisma.twinVector.findUnique({
      where: { ownerType_ownerId: { ownerType: typeA, ownerId: idA } },
    }),
    prisma.twinVector.findUnique({
      where: { ownerType_ownerId: { ownerType: typeB, ownerId: idB } },
    }),
  ])
  if (!twinA || !twinB) return 1.0

  const vectorColumnA = twinA.realityEmbedding ? "reality_vector" : "embedding_vector"
  const vectorColumnB = twinB.realityEmbedding ? "reality_vector" : "embedding_vector"

  const rows = await prisma.$queryRawUnsafe<{ distance: number }[]>(
    `SELECT (SELECT "${vectorColumnA}" FROM "twin_vectors" WHERE "id" = $1)
            <=>
            (SELECT "${vectorColumnB}" FROM "twin_vectors" WHERE "id" = $2) AS distance`,
    twinA.id,
    twinB.id,
  )

  return rows[0]?.distance ?? 1.0
}

// ---------------------------------------------------------------------------
// Batch alignment generation
// ---------------------------------------------------------------------------

export async function generateAndSaveAlignments(userId: string): Promise<number> {
  const neighbors = await findNearestNeighbors(userId, "USER", 20)
  let saved = 0

  for (const n of neighbors) {
    const [twinA, twinB] = await Promise.all([
      prisma.twinVector.findUnique({
        where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
      }),
      prisma.twinVector.findUnique({
        where: { ownerType_ownerId: { ownerType: n.ownerType as any, ownerId: n.ownerId } },
      }),
    ])
    if (!twinA || !twinB) continue

    const result = await computeAlignment(twinA, twinB)

    await prisma.alignment.upsert({
      where: {
        userTwinId_matchTwinId: {
          userTwinId: twinA.id,
          matchTwinId: twinB.id,
        },
      },
      update: {
        overallScore: result.overallScore,
        skillScore: result.skillScore,
        valueScore: result.valueScore,
        constraintScore: result.constraintScore,
        diversityBonus: result.diversityBonus,
        breakdown: result.breakdown,
      },
      create: {
        userTwinId: twinA.id,
        matchTwinId: twinB.id,
        overallScore: result.overallScore,
        skillScore: result.skillScore,
        valueScore: result.valueScore,
        constraintScore: result.constraintScore,
        diversityBonus: result.diversityBonus,
        breakdown: result.breakdown,
      },
    })
    saved++
  }

  return saved
}
