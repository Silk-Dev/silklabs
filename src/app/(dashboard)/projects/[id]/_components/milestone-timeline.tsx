import { format } from "date-fns"
import { cn } from "@/lib/utils"

export interface MilestoneView {
  id: string
  title: string
  description: string | null
  targetDate: Date | null
  status: "Done" | "Current" | "Upcoming"
}

const STATUS_STYLE = {
  Done: {
    node: "bg-primary-container border-primary-container text-[#0d1515]",
    ring: "",
    label: "Done",
  },
  Current: {
    node: "bg-surface border-primary-container text-primary-container",
    ring: "absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-container opacity-40",
    label: "In progress",
  },
  Upcoming: {
    node: "bg-surface border-border-metal text-outline",
    ring: "",
    label: "Upcoming",
  },
} as const

function StatusBadge({ status }: { status: MilestoneView["status"] }) {
  const style = STATUS_STYLE[status]
  return (
    <span className="border border-border-metal bg-surface/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-outline">
      {style.label}
    </span>
  )
}

/**
 * Vertical campaign timeline (Kickstarter-style): a spine on the left, one node
 * per milestone. Done nodes are filled, the current one pulses, upcoming are hollow.
 */
export function MilestoneTimeline({ milestones }: { milestones: MilestoneView[] }) {
  if (milestones.length === 0) return null

  return (
    <ol className="relative space-y-8 border-l border-border-metal pl-6 ml-3">
      {milestones.map((m) => {
        const style = STATUS_STYLE[m.status]
        return (
          <li key={m.id} className="relative">
            {/* Node */}
            <span
              className={cn(
                "absolute -left-[31px] top-1 flex size-3 items-center justify-center rounded-full border",
                style.node
              )}
            >
              {style.ring && <span className={style.ring} />}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading text-sm font-semibold text-primary">{m.title}</h4>
              <StatusBadge status={m.status} />
              {m.targetDate && (
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                  {format(m.targetDate, "MMM yyyy")}
                </span>
              )}
            </div>
            {m.description && (
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-outline whitespace-pre-line">
                {m.description}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
