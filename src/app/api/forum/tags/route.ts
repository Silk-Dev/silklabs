import { NextResponse } from "next/server"
import { getAllTags } from "@/services/forum.service"

export async function GET() {
  const tags = await getAllTags()
  return NextResponse.json(tags)
}
