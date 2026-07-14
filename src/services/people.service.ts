"use server"

import { prisma } from "@/lib/prisma"

export async function getPeople() {
  return prisma.profile.findMany({
    where: {
      isPublic: true,
      onboardingCompleted: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getPerson(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
        },
      },
    },
  })
}
