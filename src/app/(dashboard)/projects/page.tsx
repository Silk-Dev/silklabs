import Link from "next/link"
import { getMyProjects } from "@/services/project.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function MyProjectsPage() {
  const projects = await getMyProjects()

  return (
    <div className="space-y-6 [animation:entrance_0.5s_ease-out_both]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">My Projects</h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">Projects you own or manage</p>
        </div>
        <Link href="/projects/new">
          <Button className="font-mono text-[10px] uppercase tracking-[0.06em]">New Project</Button>
        </Link>
      </div>

      {projects.length === 0 && (
        <p className="py-12 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
          You haven&apos;t created any projects yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card
              className="h-full transition-[transform,box-shadow] duration-160 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-md"
              style={{ animation: `entrance 0.5s ease-out ${i * 0.06}s both` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-sm font-semibold text-primary">{project.title}</h3>
                  <Badge variant="outline" className="border-border-metal font-mono text-[10px] uppercase tracking-[0.06em] text-outline">{project.phase}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 font-mono text-[11px] uppercase tracking-[0.06em] text-outline/70">
                  <p>{project.roles.length} role{project.roles.length !== 1 ? "s" : ""} defined</p>
                  <p>{project.teamMembers.length} team member{project.teamMembers.length !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
