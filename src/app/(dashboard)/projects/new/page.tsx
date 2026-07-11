import { prisma } from "@/lib/prisma"
import { WizardShell } from "./_components/wizard-shell"

export default async function NewProjectPage() {
  const allTags = await prisma.tag.findMany({ orderBy: { name: "asc" } })

  return <WizardShell allTags={allTags} />
}
