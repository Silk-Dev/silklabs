import { NextRequest, NextResponse } from "next/server"
import { buildConcept } from "@/lib/concept.service"

export async function POST(req: NextRequest) {
  try {
    const { atoms } = await req.json()
    if (!atoms || !Array.isArray(atoms) || atoms.length === 0) {
      return NextResponse.json({ error: "Atoms array required" }, { status: 400 })
    }
    const concept = await buildConcept(atoms)
    return NextResponse.json(concept)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
