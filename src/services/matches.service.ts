import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/dal"
import { findNearestNeighbors, computeAlignment } from "@/lib/alignment.service"
import { createNotification } from "@/services/notification.service"

export interface MatchResult {
  userId: string
  name: string
  image: string | null
  bio: string | null
  topSkill: string | null
  location: string | null
  skills: string[]
  alignmentId: string
  overallScore: number
  skillScore: number
  valueScore: number
  constraintScore: number
  diversityBonus: number
  breakdown: any
  report: string | null
  userFeedback: string | null
  lastRefreshed: Date
  isHotMatch: boolean
}

/**
 * Lightweight read — fetches top 3 precomputed alignments from DB.
 * Does NOT recompute. Returns [] if no alignments exist yet.
 * Use refreshAlignments() to trigger a recompute.
 */
export async function getTopMatches(): Promise<MatchResult[]> {
  const session = await requireAuth()
  const userId = session.user.id

  const userTwin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
  })
  if (!userTwin) return []

  const alignments = await prisma.alignment.findMany({
    where: { userTwinId: userTwin.id },
    orderBy: { overallScore: "desc" },
    take: 10,
  })

  if (alignments.length === 0) return []

  const results: MatchResult[] = []

  for (const a of alignments) {
    const matchTwin = await prisma.twinVector.findUnique({
      where: { id: a.matchTwinId },
    })
    if (!matchTwin || matchTwin.ownerType !== "USER") continue

    const user = await prisma.user.findUnique({
      where: { id: matchTwin.ownerId },
      include: { profile: true },
    })
    if (!user || !user.profile) continue

    // Check mutual high alignment
    let isHotMatch = false
    if (a.overallScore >= 0.8) {
      const reverse = await prisma.alignment.findFirst({
        where: {
          userTwinId: matchTwin.id,
          matchTwinId: userTwin.id,
          overallScore: { gte: 0.8 },
        },
      })
      isHotMatch = !!reverse
    }

    results.push({
      userId: user.id,
      name: user.name || "Unknown",
      image: user.image,
      bio: user.profile.bio,
      topSkill: user.profile.topSkill,
      location: user.profile.location,
      skills: (user.profile.skills as string[]) || [],
      alignmentId: a.id,
      overallScore: a.overallScore,
      skillScore: a.skillScore,
      valueScore: a.valueScore,
      constraintScore: a.constraintScore,
      diversityBonus: a.diversityBonus,
      breakdown: a.breakdown,
      report: a.report,
      userFeedback: a.userFeedback,
      lastRefreshed: a.updatedAt,
      isHotMatch,
    })
  }

  return results.slice(0, 3)
}

/**
 * Full recompute: finds nearest neighbors, computes alignments, upserts,
 * sends notifications for high scores, returns fresh top 3.
 */
export async function refreshAlignments(): Promise<{
  alignmentsCreated: number
  matches: MatchResult[]
}> {
  const session = await requireAuth()
  const userId = session.user.id

  // Build twin if missing
  const userTwin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
  })
  if (!userTwin || !userTwin.embedding) {
    // Try building the twin
    const { buildTwin } = await import("@/lib/twin.service")
    try {
      await buildTwin(userId, "USER")
    } catch {
      return { alignmentsCreated: 0, matches: [] }
    }
  }

  // Find nearest neighbors
  const nearest = await findNearestNeighbors(userId, "USER", 20)

  let alignmentsCreated = 0
  const alignmentsSaved: Array<{
    alignment: any
    userTwinId: string
    matchTwinId: string
    matchUserId: string
    overallScore: number
  }> = []

  for (const n of nearest) {
    if (n.ownerType !== "USER") continue

    const matchTwin = await prisma.twinVector.findUnique({
      where: { ownerType_ownerId: { ownerType: "USER", ownerId: n.ownerId } },
    })
    if (!matchTwin) continue

    const updatedUserTwin = await prisma.twinVector.findUnique({
      where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
    })
    if (!updatedUserTwin) continue

    const scores = await computeAlignment(updatedUserTwin, matchTwin)

    const user = await prisma.user.findUnique({
      where: { id: n.ownerId },
      include: { profile: true },
    })
    if (!user || !user.profile) continue

    // Generate report
    const report = generateAlignmentReport(scores, user.profile)

    // Upsert
    const alignment = await prisma.alignment.upsert({
      where: {
        userTwinId_matchTwinId: {
          userTwinId: updatedUserTwin.id,
          matchTwinId: matchTwin.id,
        },
      },
      update: {
        overallScore: scores.overallScore,
        skillScore: scores.skillScore,
        valueScore: scores.valueScore,
        constraintScore: scores.constraintScore,
        diversityBonus: scores.diversityBonus,
        breakdown: scores.breakdown,
        report,
      },
      create: {
        userTwinId: updatedUserTwin.id,
        matchTwinId: matchTwin.id,
        overallScore: scores.overallScore,
        skillScore: scores.skillScore,
        valueScore: scores.valueScore,
        constraintScore: scores.constraintScore,
        diversityBonus: scores.diversityBonus,
        breakdown: scores.breakdown,
        report,
      },
    })

    alignmentsCreated++

    // Track high-alignment matches for notification
    if (scores.overallScore >= 0.8) {
      alignmentsSaved.push({
        alignment,
        userTwinId: updatedUserTwin.id,
        matchTwinId: matchTwin.id,
        matchUserId: matchTwin.ownerId,
        overallScore: scores.overallScore,
      })
    }
  }

  // Send notifications for high-alignment matches (fire and forget)
  for (const h of alignmentsSaved) {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
      const matchUser = await prisma.user.findUnique({
        where: { id: h.matchUserId },
        select: { name: true },
      })
      const matchName = matchUser?.name || "a potential partner"

      // Notify the match that someone has high alignment with them
      await createNotification(h.matchUserId, {
        type: "match",
        title: `🧠 Strong alignment detected`,
        body: `${currentUser?.name || "Someone"} has a ${(h.overallScore * 100).toFixed(0)}% alignment with you. Check your matches!`,
        link: "/matches",
      })
    } catch {
      // Notification failure is non-critical
    }
  }

  // Return fresh top 3
  const matches = await getTopMatches()
  return { alignmentsCreated, matches }
}

/**
 * Generates a template-based alignment report from the scoring breakdown.
 * Fully explainable — no black-box.
 */
function generateAlignmentReport(scores: any, profile: any): string {
  const skillOverlap = scores.skillScore >= 0.7
    ? "Strong alignment: your skill vectors are closely related. You likely share domain expertise."
    : scores.skillScore >= 0.4
      ? "Moderate alignment: your skill areas overlap in meaningful ways. Complementary expertise possible."
      : "Low skill overlap: your expertise areas differ significantly. This could be a cross-disciplinary opportunity."

  const valueAlignment = scores.valueScore >= 0.5
    ? "Values and motivations are well-aligned. You're likely to have compatible working styles and priorities."
    : "Values show some divergence. Discuss work style and priorities early."

  const constraintStatus = scores.constraintScore > 0
    ? "✅ Hard constraints satisfied. Location and commitment levels are compatible."
    : "❌ Hard constraints conflict. Review location and commitment expectations."

  const diversityNote = scores.diversityBonus > 0.15
    ? "High diversity bonus: your perspectives are meaningfully different — this often produces stronger outcomes."
    : "Moderate diversity: your backgrounds share common ground, which may reduce friction."

  const profileNote = profile?.topSkill
    ? `\n\nNotable: Their top skill is "${profile.topSkill}".`
    : ""

  return [
    `## Alignment Report (Score: ${scores.overallScore})`,
    "",
    `### Skill Overlap (${(scores.skillScore * 100).toFixed(0)}%)`,
    skillOverlap,
    "",
    `### Value Alignment (${(scores.valueScore * 100).toFixed(0)}%)`,
    valueAlignment,
    "",
    `### Constraint Analysis`,
    constraintStatus,
    "",
    `### Complementary Strengths`,
    diversityNote,
    profileNote,
  ].join("\n")
}

/**
 * Records user feedback on a match (thumbs up/down).
 */
export async function submitMatchFeedback(
  alignmentId: string,
  feedback: "good" | "ok" | "bad",
) {
  const session = await requireAuth()
  const alignment = await prisma.alignment.findUnique({
    where: { id: alignmentId },
  })
  if (!alignment) throw new Error("Alignment not found")

  const userTwin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: session.user.id } },
  })
  if (!userTwin || alignment.userTwinId !== userTwin.id) {
    throw new Error("Not your alignment")
  }

  return prisma.alignment.update({
    where: { id: alignmentId },
    data: { userFeedback: feedback },
  })
}

/**
 * Gets current user's twin status (for onboarding step 10).
 */
export async function getTwinStatus(): Promise<{
  hasTwin: boolean
  lastRefreshed: Date | null
}> {
  const session = await requireAuth()
  const twin = await prisma.twinVector.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: session.user.id } },
    select: { id: true, updatedAt: true },
  })

  return {
    hasTwin: !!twin?.id,
    lastRefreshed: twin?.updatedAt || null,
  }
}

/**
 * Auto-match on project creation: finds top 3 user matches for a project's
 * skill needs and sends them notifications.
 */
export async function autoMatchProject(
  projectId: string,
  projectTitle: string,
): Promise<number> {
  const session = await requireAuth()

  // Build the project twin
  const { buildTwin } = await import("@/lib/twin.service")
  try {
    await buildTwin(projectId, "PROJECT")
  } catch {
    return 0
  }

  // Find nearest USER neighbors for this PROJECT twin
  const nearest = await findNearestNeighbors(projectId, "PROJECT", 3)

  let notified = 0
  for (const n of nearest) {
    if (n.ownerType !== "USER") continue

    try {
      await createNotification(n.ownerId, {
        type: "project_match",
        title: `🎯 You matched with "${projectTitle}"`,
        body: `Your profile aligns with this project's needs. Check it out.`,
        link: `/projects/${projectId}`,
      })
      notified++
    } catch {
      // non-critical
    }
  }

  return notified
}
