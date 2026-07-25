import { prisma } from "@/lib/prisma"

// ============================================================================
// 1. SCORING FORMULA & COMPONENTS
// ============================================================================

/**
 * Computes the alignment score between two twins.
 * @returns An object containing the overall score and the breakdown.
 */
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
  // 1. Skill Score: Cosine similarity of the main embeddings
  // Note: pgvector <=> returns cosine DISTANCE (0 = identical, 1 = opposite).
  // Similarity = 1 - Distance.
  const skillDistance = await getCosineDistance(
    twinA.ownerId,
    twinA.ownerType,
    twinB.ownerId,
    twinB.ownerType,
  )
  const skillScore = Math.max(0, 1 - skillDistance)

  // 2. Value Score: Deterministic proxy via skill overlap from twinProfile
  const valueScore = computeValueOverlap(twinA.twinProfile, twinB.twinProfile)

  // 3. Constraint Score: Fraction of hard constraints satisfied
  const constraintResult = evaluateHardConstraints(twinA, twinB)
  const constraintScore = constraintResult.passed ? 1.0 : 0.0

  // 4. Diversity Bonus: 1 - cosineSimilarity, capped at 0.3
  const diversityBonus = Math.min(0.3, 1 - skillScore)

  // FINAL FORMULA: 0.35 * skill + 0.25 * constraint + 0.20 * value + 0.20 * diversity
  // If hard constraints fail, the whole thing is 0.
  const overallScore = constraintResult.passed
    ? 0.35 * skillScore + 0.25 * constraintScore + 0.20 * valueScore + 0.20 * diversityBonus
    : 0.0

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    skillScore: Math.round(skillScore * 100) / 100,
    valueScore: Math.round(valueScore * 100) / 100,
    constraintScore: Math.round(constraintScore * 100) / 100,
    diversityBonus: Math.round(diversityBonus * 100) / 100,
    breakdown: {
      constraintFailures: constraintResult.failures,
      skillDistance,
    },
  }
}

// ============================================================================
// 2. HARD CONSTRAINT SOLVER
// ============================================================================

export function evaluateHardConstraints(
  twinA: any,
  twinB: any,
): { passed: boolean; failures: string[] } {
  const failures: string[] = []
  const profileA = twinA.twinProfile
  const profileB = twinB.twinProfile
  const prefA = twinA.preferences
  const prefB = twinB.preferences

  // Hard Constraint 1: Location — if A has a specific location and B has a
  // different specific location, flag a mismatch.
  const locA = prefA?.location || ""
  const locB = prefB?.location || ""
  if (locA && locB && locA.toLowerCase() !== locB.toLowerCase()) {
    failures.push(`Location mismatch: ${locA} vs ${locB}`)
  }

  // Hard Constraint 2: Commitment — if A requires full-time, B must offer
  // at least full-time.
  const commitmentLevels: Record<string, number> = {
    unspecified: 0,
    "part-time": 1,
    "full-time": 2,
  }
  const reqA = commitmentLevels[prefA?.commitment || "unspecified"] ?? 0
  const offerB = commitmentLevels[profileB?.commitment || "unspecified"] ?? 0

  if (reqA > offerB) {
    failures.push(
      `Commitment mismatch: A requires ${prefA?.commitment || "unspecified"}, B offers ${profileB?.commitment || "unspecified"}`,
    )
  }

  return {
    passed: failures.length === 0,
    failures,
  }
}

export function computeValueOverlap(profileA: any, profileB: any): number {
  // Jaccard similarity of skills — deterministic, no randomness
  const skillsA = new Set<string>(profileA?.skills || [])
  const skillsB = new Set<string>(profileB?.skills || [])

  if (skillsA.size === 0 || skillsB.size === 0) return 0.0 // No data = no signal

  let overlap = 0
  skillsA.forEach((skill) => {
    if (skillsB.has(skill)) overlap++
  })

  const union = new Set([...skillsA, ...skillsB]).size
  return overlap / union
}

// ============================================================================
// 3. NEAREST NEIGHBOR QUERY (Raw SQL)
// ============================================================================

/**
 * Finds the top N nearest neighbors for a given twin using pgvector cosine
 * distance (<=>).
 */
export async function findNearestNeighbors(
  ownerId: string,
  ownerType: "USER" | "PROJECT",
  limit: number = 10,
) {
  // Get the query twin's embedding string
  const queryTwin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
  })

  if (!queryTwin || !queryTwin.embedding) {
    throw new Error(`No embedding found for ${ownerType} ${ownerId}`)
  }

  // Raw SQL to find nearest neighbors using the IVFFlat index.
  // Uses a CTE to avoid a pgvector correlated-subquery issue with WHERE filtering.
  const neighbors = await prisma.$queryRaw<any[]>`
    WITH query_twin AS (
      SELECT "embedding_vector" AS vec
      FROM twin_vectors
      WHERE "ownerId" = ${ownerId} AND "ownerType" = ${ownerType}
    )
    SELECT
      t."ownerId",
      t."ownerType",
      (t."embedding_vector" <=> q.vec) AS distance
    FROM twin_vectors t, query_twin q
    WHERE t."ownerType" != ${ownerType} OR t."ownerId" != ${ownerId}
    ORDER BY distance ASC
    LIMIT ${limit}
  `

  return neighbors
}

/**
 * Gets the exact cosine distance between two specific twins.
 */
async function getCosineDistance(
  idA: string,
  typeA: string,
  idB: string,
  typeB: string,
): Promise<number> {
  const result = await prisma.$queryRaw<any[]>`
    SELECT
      (SELECT "embedding_vector" FROM twin_vectors
       WHERE "ownerId" = ${idA} AND "ownerType" = ${typeA})
      <=>
      (SELECT "embedding_vector" FROM twin_vectors
       WHERE "ownerId" = ${idB} AND "ownerType" = ${typeB})
      AS distance
  `
  // Note: when either embedding_vector is null, the <=> operator returns null.
  // Default to max distance (1.0) if null.
  return result[0]?.distance ?? 1.0
}

// ============================================================================
// 4. BATCH MATCHING & PERSISTENCE
// ============================================================================

export async function generateAndSaveAlignments(userId: string) {
  const userTwin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
  })
  if (!userTwin) throw new Error(`User twin not found for ${userId}`)

  // Find top 20 nearest PROJECT twins
  const nearestProjects = await findNearestNeighbors(userId, "USER", 20)

  const alignmentsToUpsert: Array<{
    userTwinId: string
    matchTwinId: string
    overallScore: number
    skillScore: number
    valueScore: number
    constraintScore: number
    diversityBonus: number
    breakdown: any
  }> = []

  for (const proj of nearestProjects) {
    const projTwin = await prisma.twinVector.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: proj.ownerType as "USER" | "PROJECT",
          ownerId: proj.ownerId as string,
        },
      },
    })
    if (!projTwin) continue

    const scores = await computeAlignment(userTwin, projTwin)

    // Only save if it passes hard constraints and has a meaningful score
    if (scores.constraintScore > 0 && scores.overallScore > 0.3) {
      alignmentsToUpsert.push({
        userTwinId: userTwin.id,
        matchTwinId: projTwin.id,
        overallScore: scores.overallScore,
        skillScore: scores.skillScore,
        valueScore: scores.valueScore,
        constraintScore: scores.constraintScore,
        diversityBonus: scores.diversityBonus,
        breakdown: scores.breakdown,
      })
    }
  }

  // Bulk upsert alignments via transaction
  if (alignmentsToUpsert.length > 0) {
    await prisma.$transaction(
      alignmentsToUpsert.map((data) =>
        prisma.alignment.upsert({
          where: {
            userTwinId_matchTwinId: {
              userTwinId: data.userTwinId,
              matchTwinId: data.matchTwinId,
            },
          },
          update: data,
          create: data,
        }),
      ),
    )
  }

  return alignmentsToUpsert.length
}
