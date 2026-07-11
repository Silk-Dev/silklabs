interface RoleCardProps {
  role: {
    id: string
    title: string
    description: string | null
    isFilled: boolean
    tags: Array<{ tag: { id: string; name: string } }>
    _count?: { applications: number }
  }
  onApply?: (roleId: string) => void
  showApply?: boolean
}

export function RoleCard({ role, onApply, showApply }: RoleCardProps) {
  return (
    <div
      className={`relative overflow-hidden border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-4 ${
        role.isFilled ? "opacity-50" : ""
      }`}
    >
      <div className="absolute inset-y-0 left-0 w-[3px] bg-border-metal" />
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-heading text-sm font-semibold text-primary">
            {role.title}
          </h4>
          {role.description && (
            <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-outline">
              {role.description}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.05em] ${
            role.isFilled
              ? "border-border-metal bg-surface/60 text-outline"
              : "border-primary-container/28 bg-primary-container/8 text-primary-container"
          }`}
        >
          {role.isFilled ? "Filled" : "Open"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {role.tags.map((t) => (
          <span
            key={t.tag.id}
            className="inline-flex items-center border border-border-metal bg-surface/60 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.05em] text-outline"
          >
            {t.tag.name}
          </span>
        ))}
      </div>
      {showApply && !role.isFilled && onApply && (
        <div className="mt-3">
          <button
            onClick={() => onApply(role.id)}
            className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-primary-container transition-colors hover:text-primary"
          >
            Apply for this role →
          </button>
        </div>
      )}
    </div>
  )
}
