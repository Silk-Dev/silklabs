import { prisma } from "../../src/lib/prisma"

async function main() {
  const project = await prisma.project.findFirst({ where: { title: "PixPay" } })
  if (!project) throw new Error("PixPay not found")

  await prisma.project.update({
    where: { id: project.id },
    data: {
      whatWeAre:
        "<h2>Why PixPay exists</h2><p>We watched freelance creators in emerging markets lose 15-20% of every payout to intermediary fees and slow rails.</p><p>We are a team of payments nerds who believe <strong>getting paid should be boring</strong>.</p>",
      whatWereBuilding:
        "<h2>Instant payouts for creator teams</h2><p>A wallet layer that splits revenue across team members the moment it lands.</p><ul><li>Multi-currency splits</li><li>Zero-fee internal transfers</li><li>Payout rails optimized per region</li></ul><blockquote>Built by people who got burned by slow invoices.</blockquote>",
    },
  })

  await prisma.projectMilestone.deleteMany({ where: { projectId: project.id } })
  await prisma.projectMilestone.createMany({
    data: [
      { projectId: project.id, title: "Prototype & user interviews", description: "20 interviews with creator teams across 6 countries.", status: "Done", position: 0 },
      { projectId: project.id, title: "Closed alpha payouts live", description: "Split payouts running for 5 pilot teams.", status: "Current", position: 1, targetDate: new Date("2026-10-15") },
      { projectId: project.id, title: "Public launch (EU + West Africa)", status: "Upcoming", position: 2, targetDate: new Date("2027-01-31") },
    ],
  })
  console.log("Populated:", project.title)
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
