import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const count = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  })

  return NextResponse.json({ count })
}
