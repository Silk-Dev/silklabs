import { NextRequest, NextResponse } from "next/server"
import { buildConcept } from "@/lib/concept.service"
import { requireApiAuth } from "@/lib/dal"

export async function POST(req: NextRequest) {
  const session = await requireApiAuth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { atoms } = await req.json()
    if (!atoms || !Array.isArray(atoms) || atoms.length === 0) {
      return NextResponse.json({ error: "Atoms array required" }, { status: 400 })
    }
    const concept = await buildConcept(atoms)
    return NextResponse.json(concept)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
