import { prisma } from "../../src/lib/prisma"

async function main() {
  const stamp = new Date()
  const user = await prisma.user.create({
    data: { email: `terms-verify-${stamp.getTime()}@example.invalid`, name: "ToS Verify", termsAcceptedAt: stamp },
  })
  const read = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { termsAcceptedAt: true } })
  console.log("termsAcceptedAt persisted:", read.termsAcceptedAt?.toISOString() === stamp.toISOString())
  await prisma.user.delete({ where: { id: user.id } })
  console.log("cleanup ok")
}

main().then(
  () => console.log("DONE"),
  (e) => { console.error("FAILED:", e.message ?? e); process.exitCode = 1 }
)
