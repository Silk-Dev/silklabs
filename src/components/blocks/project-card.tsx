import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProjectCardProps {
  project: {
    id: string
    title: string
    tagline: string | null
    phase: string
    coverImage: string | null
    owner: { id: string; name: string | null; image: string | null }
    roles: Array<{
      id: string
      title: string
      isFilled: boolean
      tags: Array<{ tag: { id: string; name: string } }>
    }>
    _count?: { teamMembers: number }
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const openRoles = project.roles.filter((r) => !r.isFilled)
  const techTags = project.roles.flatMap((r) => r.tags.map((t) => t.tag.name))
  const uniqueTags = [...new Set(techTags)]

  return (
    <Link href={`/projects/${project.id}`}>
      <article className="group relative overflow-hidden border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] shadow-[0_18px_48px_rgba(0,0,0,0.24)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] hover:shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-120%] skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-[120%]" />
        <div className="absolute inset-y-0 left-0 w-[3px] bg-border-metal" />
        {project.coverImage && (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={project.coverImage}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-base font-bold leading-tight text-primary">
              {project.title}
            </h3>
            <Badge
              variant="outline"
              className="shrink-0 border-border-metal font-mono text-[9px] uppercase tracking-[0.06em] text-outline"
            >
              {project.phase}
            </Badge>
          </div>
          {project.tagline && (
            <p className="mt-1 line-clamp-2 font-mono text-[11px] uppercase tracking-[0.04em] text-outline">
              {project.tagline}
            </p>
          )}
          <div className="mt-3 space-y-2">
            {openRoles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {openRoles.slice(0, 3).map((role) => (
                  <span
                    key={role.id}
                    className="inline-flex items-center border border-primary-container/28 bg-primary-container/8 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.05em] text-primary-container"
                  >
                    {role.title}
                  </span>
                ))}
                {openRoles.length > 3 && (
                  <span className="inline-flex items-center border border-primary-container/28 bg-primary-container/8 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.05em] text-primary-container">
                    +{openRoles.length - 3}
                  </span>
                )}
              </div>
            )}
            {uniqueTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {uniqueTags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center border border-border-metal bg-surface/60 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.05em] text-outline"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border-metal pt-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={project.owner.image ?? undefined} />
              <AvatarFallback className="font-mono text-[9px] uppercase">
                {project.owner.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-outline">
              {project.owner.name ?? "Anonymous"}
            </span>
            {project._count && (
              <>
                <span className="text-outline/40">·</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-outline">
                  {project._count.teamMembers} members
                </span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
