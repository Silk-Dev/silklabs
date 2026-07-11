import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/login", "/register", "/api/auth"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()
}
