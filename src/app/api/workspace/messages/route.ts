import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const messages = await prisma.message.findMany({
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  return NextResponse.json(messages)
}
