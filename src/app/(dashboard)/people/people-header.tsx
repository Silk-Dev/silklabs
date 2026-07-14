"use client"

export function PeopleHeader({
  onlineCount,
  totalCount,
}: {
  onlineCount: number
  totalCount: number
}) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">
        People
      </h1>
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
        {totalCount} member{totalCount !== 1 ? "s" : ""}
      </p>
    </div>
  )
}
