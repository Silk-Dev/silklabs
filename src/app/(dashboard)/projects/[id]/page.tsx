import { getProject } from "@/services/project.service"
import { getApplicationsForProject } from "@/services/application.service"
import { getSession } from "@/lib/auth"
import { isProjectOwner, isTeamMember } from "@/lib/dal"
import { sanitizeRichText } from "@/lib/sanitize"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { MilestoneTimeline } from "./_components/milestone-timeline"
import { MilestoneManager } from "./_components/milestone-manager"
import { EditStoryButton } from "./_components/edit-story-button"

// Minimal typography for owner-authored Tiptap HTML (no typography plugin in this repo).
const richText =
  "font-mono text-[12px] leading-relaxed tracking-[0.04em] text-outline " +
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-primary [&_h2:first-child]:mt-0 " +
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-primary " +
  "[&_p]:my-2 [&_strong]:text-primary [&_em]:italic " +
  "[&_ul]:my-2 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 " +
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary-container/40 [&_blockquote]:pl-3 [&_blockquote]:italic " +
  "[&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_hr]:my-4 [&_hr]:border-border-metal"

function StorySection({
  title,
  html,
  isOwner,
  editTrigger,
  children,
}: {
  title: string
  html: string | null
  isOwner: boolean
  editTrigger?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold text-primary">{title}</h2>
        {editTrigger}
      </div>
      {html ? (
        <div className={richText} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />
      ) : (
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
          {isOwner ? "Write this section so visitors know your story." : "Coming soon."}
        </p>
      )}
      {children}
    </section>
  )
}

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
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{project.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ── Campaign hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border border-border-metal">
        {project.coverImage ? (
          <div className="relative h-44 w-full sm:h-56">
            <Image
              src={project.coverImage}
              alt=""
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,21,21,0.92)] to-transparent" />
          </div>
        ) : (
          <div className="h-24 w-full bg-[radial-gradient(ellipse_at_left,rgba(0,240,255,0.08),transparent_70%)]" />
        )}
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 pt-4">
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
              <p className="max-w-2xl font-mono text-[13px] uppercase tracking-[0.06em] text-outline">
                {project.tagline}
              </p>
            )}
            {project.owner.name && (
              <div className="flex items-center gap-2 pt-1">
                <Avatar className="size-6">
                  <AvatarImage src={project.owner.image ?? undefined} />
                  <AvatarFallback className="font-mono text-[9px] uppercase">
                    {project.owner.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                  by {project.owner.name} · {project.teamMembers.length} builder
                  {project.teamMembers.length !== 1 ? "s" : ""} on board
                </span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isOwner && (
              <>
                <MilestoneManager projectId={project.id} milestones={project.milestones} />
                <ProjectActions projectId={project.id} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="space-y-8 lg:col-span-8">
          <StorySection
            title="What we are"
            html={project.whatWeAre}
            isOwner={isOwner}
            editTrigger={
              isOwner ? (
                <EditStoryButton
                  projectId={project.id}
                  projectTitle={project.title}
                  initialWhatWeAre={project.whatWeAre}
                  initialWhatWereBuilding={project.whatWereBuilding}
                />
              ) : undefined
            }
          />

          <Separator className="bg-border-metal" />

          <StorySection
            title="What we're building"
            html={project.whatWereBuilding}
            isOwner={isOwner}
            /* Legacy plain-text description shown until the owner authors this section */
          >
            {!project.whatWereBuilding && project.description && (
              <p className="mt-3 font-mono text-[12px] leading-relaxed tracking-[0.04em] text-outline whitespace-pre-line">
                {project.description}
              </p>
            )}
          </StorySection>

          <Separator className="bg-border-metal" />

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-semibold text-primary">
                Timeline &amp; current phases
              </h2>
            </div>
            {project.milestones.length > 0 ? (
              <MilestoneTimeline milestones={project.milestones} />
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
                {isOwner ? "Add milestones to show where this project stands." : "No timeline published yet."}
              </p>
            )}
          </section>

          <Separator className="bg-border-metal" />

          <section>
            <h2 className="mb-4 font-heading text-xl font-semibold text-primary">
              The people behind it ({new Set([project.ownerId, ...project.teamMembers.map((m) => m.userId)]).size})
            </h2>
            <TeamGrid
              members={project.teamMembers.filter((m) => m.userId !== project.ownerId)}
              owner={project.owner}
            />
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

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="lg:sticky lg:top-20 space-y-6">
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
