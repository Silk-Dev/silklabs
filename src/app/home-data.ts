import { prisma } from "@/lib/prisma"

export async function getHomePageData() {
  try {
    const [projectCount, userCount, featuredProjects] = await Promise.all([
      prisma.project.count({ where: { isPublic: true } }),
      prisma.user.count(),
      prisma.project.findMany({
        where: { isPublic: true },
        include: {
          owner: { select: { id: true, name: true, image: true } },
          roles: {
            where: { isFilled: false },
            take: 3,
            include: { tags: { include: { tag: true } } },
          },
          _count: { select: { teamMembers: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ])

    const totalTeamMembers = featuredProjects.reduce(
      (sum, p) => sum + p._count.teamMembers,
      0
    )

    return { projectCount, userCount, featuredProjects, totalTeamMembers }
  } catch {
    return null
  }
}
