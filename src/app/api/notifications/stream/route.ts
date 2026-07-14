import { auth } from "@/lib/auth"
import pg from "pg"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = session.user.id
  const channel = `notify_${userId.replace(/-/g, "_")}`

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  await client.query(`LISTEN "${channel}"`)

  const stream = new ReadableStream({
    start(controller) {
      client.on("notification", (msg) => {
        if (msg.payload) {
          controller.enqueue(`data: ${msg.payload}\n\n`)
        }
      })

      const keepAlive = setInterval(() => {
        controller.enqueue(`:keepalive\n\n`)
      }, 15000)

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive)
        client.end().catch(() => {})
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
