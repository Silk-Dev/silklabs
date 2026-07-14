export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { searchProjects } from "@/services/discovery.service"
import { ProjectCard } from "@/components/blocks/project-card"
import { BookmarkButton } from "@/components/blocks/bookmark-button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { DiscoverFilters } from "./_components/discover-filters"
import { MobileFilterSheet } from "./_components/mobile-filter-sheet"

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    techStack?: string
    phase?: string
    roleAvailable?: string
  }>
}) {
  const sp = await searchParams
  const page = Number(sp.page) || 1
  const selectedTags = sp.techStack
    ? sp.techStack.split(",").filter(Boolean)
    : []
  const selectedPhase = sp.phase ?? null
  const roleAvailableOnly = sp.roleAvailable === "true"

  const session = await getSession()

  const [allTags, bookmarks] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    session?.user
      ? prisma.bookmark.findMany({
          where: { userId: session.user.id },
          select: { projectId: true },
        })
      : [],
  ])
  const bookmarkedIds = new Set(bookmarks.map((b) => b.projectId))

  const filterProps = {
    tags: allTags,
    selectedTags,
    selectedPhase,
    roleAvailableOnly,
  }

  const result = await searchProjects({
    page,
    limit: 12,
    techStack: selectedTags.length > 0 ? selectedTags : undefined,
    phase: selectedPhase ?? undefined,
    roleAvailable: roleAvailableOnly || undefined,
  })

  if ("error" in result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Discover Projects</h1>
        <p className="text-muted-foreground">Something went wrong. Please try again.</p>
      </div>
    )
  }

  const { projects, pagination } = result

  function buildPageUrl(pageNum: number) {
    const params = new URLSearchParams()
    if (sp.techStack) params.set("techStack", sp.techStack)
    if (sp.phase) params.set("phase", sp.phase)
    if (sp.roleAvailable) params.set("roleAvailable", sp.roleAvailable)
    if (pageNum > 1) params.set("page", String(pageNum))
    const qs = params.toString()
    return `/discover${qs ? `?${qs}` : ""}`
  }

  function getPageNumbers(): (number | "ellipsis")[] {
    const total = pagination.totalPages
    const current = page
    const pages: (number | "ellipsis")[] = []

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 3) pages.push("ellipsis")
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (current < total - 2) pages.push("ellipsis")
      pages.push(total)
    }

    return pages
  }

  return (
    <div className="flex gap-8">
      <div className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20">
          <DiscoverFilters {...filterProps} />
        </div>
      </div>

      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">
              Discover Projects
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
              {pagination.total > 0
                ? `${pagination.total} project${pagination.total !== 1 ? "s" : ""} found`
                : "Find projects looking for collaborators"}
            </p>
          </div>
          <MobileFilterSheet {...filterProps} />
        </div>

        {projects.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <div key={project.id} className="relative">
                  <ProjectCard project={project} />
                  {session?.user && (
                    <div className="absolute top-2 right-2 z-10">
                      <BookmarkButton
                        projectId={project.id}
                        initialBookmarked={bookmarkedIds.has(project.id)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <Pagination className="pt-4">
                <PaginationContent>
                  {page > 1 && (
                    <PaginationItem>
                      <PaginationPrevious href={buildPageUrl(page - 1)} />
                    </PaginationItem>
                  )}
                  {getPageNumbers().map((p, idx) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`e-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href={buildPageUrl(p)}
                          isActive={p === page}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  {page < pagination.totalPages && (
                    <PaginationItem>
                      <PaginationNext href={buildPageUrl(page + 1)} />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="font-heading text-lg font-semibold text-primary">
                No projects match your filters
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline max-w-sm">
                Try adjusting your tech stack selection, changing the phase, or clearing all filters
                to browse all available projects.
              </p>
              <a
                href="/discover"
                className="inline-flex h-9 items-center justify-center border border-border-metal bg-surface/40 px-4 font-mono text-[10px] uppercase tracking-[0.06em] text-outline transition-colors hover:bg-surface hover:text-primary"
              >
                Clear all filters
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
