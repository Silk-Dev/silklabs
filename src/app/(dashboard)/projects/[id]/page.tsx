import { getProject } from "@/services/project.service"
import { getApplicationsForProject } from "@/services/application.service"
import { getSession } from "@/lib/auth"
import { isProjectOwner, isTeamMember } from "@/lib/dal"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ProjectActions } from "./project-actions"
import { RoleList } from "./role-list"
import { ApplicantList } from "./applicant-list"
import { TeamGrid } from "./_components/team-grid"
import { WorkspacePanel } from "./_components/workspace-panel"
import { TeamList } from "./team-list"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const session = await getSession()
  const userId = session?.user?.id
  const isOwner = userId ? await isProjectOwner(id, userId) : false
  const isMember = userId ? await isTeamMember(id, userId) : false

  const applications = isOwner ? await getApplicationsForProject(id) : []

  const userApplications = new Set(
    project.roles
      .flatMap((r) => r.applications)
      .filter((a) => a.userId === userId)
      .map((a) => a.roleId)
  )

  const openRoles = project.roles.filter((r) => !r.isFilled)

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/discover" />}>
              Discover
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{project.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
              {project.title}
            </h1>
            <Badge
              variant="outline"
              className="border-border-metal font-mono text-[10px] uppercase tracking-[0.06em] text-outline"
            >
              {project.phase}
            </Badge>
          </div>
          {project.tagline && (
            <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-outline">
              {project.tagline}
            </p>
          )}
        </div>
        {isOwner && <ProjectActions projectId={project.id} />}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section>
            <h2 className="mb-3 font-heading text-xl font-semibold text-primary">About</h2>
            {project.description ? (
              <p className="font-mono text-[12px] leading-relaxed tracking-[0.04em] text-outline whitespace-pre-line">
                {project.description}
              </p>
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
                No description provided.
              </p>
            )}
          </section>

          <Separator className="bg-border-metal" />

          <section>
            <h2 className="mb-4 font-heading text-xl font-semibold text-primary">
              Team ({project.teamMembers.length})
            </h2>
            <TeamGrid members={project.teamMembers} />
          </section>

          {isOwner && (
            <>
              <Separator className="bg-border-metal" />
              <section>
                <h2 className="mb-4 font-heading text-xl font-semibold text-primary">
                  Applications ({applications.length})
                </h2>
                {applications.length > 0 ? (
                  <ApplicantList applications={applications} />
                ) : (
                  <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
                    No applications received yet.
                  </p>
                )}
              </section>
            </>
          )}

          {(isOwner || isMember) && (
            <>
              <Separator className="bg-border-metal" />
              <section>
                <h2 className="mb-4 font-heading text-xl font-semibold text-primary">Team Management</h2>
                <TeamList
                  members={project.teamMembers}
                  isOwner={isOwner}
                  projectId={project.id}
                />
              </section>
            </>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <div className="lg:sticky lg:top-20 space-y-6">
            {isOwner ? (
              <section>
                <h2 className="mb-3 font-heading text-sm font-semibold text-primary">
                  Open Roles
                </h2>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                  {openRoles.length} role{openRoles.length !== 1 ? "s" : ""} waiting to be filled
                </p>
                <RoleList
                  roles={project.roles}
                  userId={userId}
                  isOwner={isOwner}
                  userApplications={userApplications}
                />
              </section>
            ) : (
              <section>
                <h2 className="mb-3 font-heading text-sm font-semibold text-primary">
                  Open Roles
                </h2>
                <RoleList
                  roles={project.roles}
                  userId={userId}
                  isOwner={isOwner}
                  userApplications={userApplications}
                />
              </section>
            )}

            <WorkspacePanel
              discordLink={project.discordLink}
              repoLink={project.repoLink}
              isOwner={isOwner}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
