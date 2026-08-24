import { prisma } from "../../src/lib/prisma"

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } })
  if (!user) throw new Error("No user in DB")

  const project = await prisma.project.create({
    data: {
      ownerId: user.id,
      title: "__showcase_verify__",
      tagline: "verification row",
      whatWeAre: "<h2>We are a test</h2><p>Origin story.</p>",
      whatWereBuilding: "<p>A thing.</p><ul><li>one</li></ul>",
    },
  })

  await prisma.projectMilestone.createMany({
    data: [
      { projectId: project.id, title: "MVP shipped", status: "Done", position: 0 },
      { projectId: project.id, title: "Private beta", status: "Current", position: 1, targetDate: new Date("2026-10-01") },
      { projectId: project.id, title: "Public launch", status: "Upcoming", position: 2 },
    ],
  })

  const read = await prisma.project.findUniqueOrThrow({
    where: { id: project.id },
    include: { milestones: { orderBy: [{ status: "asc" }, { position: "asc" }] } },
  })
  console.log("story fields:", JSON.stringify(read.whatWeAre), "|", JSON.stringify(read.whatWereBuilding))
  console.log("milestones:", read.milestones.map(m => `${m.position}:${m.title}(${m.status})`).join(", "))
  console.log("owner relation ok:", read.ownerId === user.id)

  await prisma.project.delete({ where: { id: project.id } })
  const cascaded = (await prisma.projectMilestone.count({ where: { projectId: project.id } })) === 0
  console.log("cleanup ok — milestone cascade:", cascaded)
}

main().then(
  () => console.log("DONE"),
  (e) => { console.error("FAILED:", e); process.exitCode = 1 }
)
