import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExternalLinkIcon } from "lucide-react"

interface WorkspacePanelProps {
  discordLink: string | null
  repoLink: string | null
  isOwner: boolean
}

export function WorkspacePanel({ discordLink, repoLink, isOwner }: WorkspacePanelProps) {
  const hasLinks = discordLink || repoLink

  if (!hasLinks && !isOwner) return null

  return (
    <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-4">
      <h3 className="mb-3 font-heading text-sm font-semibold text-primary">Workspace</h3>
      <div className="space-y-3">
        {discordLink && (
          <Link href={discordLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full justify-start font-mono text-[10px] uppercase tracking-[0.06em]">
              <ExternalLinkIcon className="mr-2 h-3.5 w-3.5" />
              Join Discord
            </Button>
          </Link>
        )}
        {repoLink && (
          <Link href={repoLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full justify-start font-mono text-[10px] uppercase tracking-[0.06em]">
              <ExternalLinkIcon className="mr-2 h-3.5 w-3.5" />
              View Repository
            </Button>
          </Link>
        )}
        {isOwner && !discordLink && !repoLink && (
          <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
            No workspace links configured yet.
          </p>
        )}
      </div>
    </div>
  )
}
