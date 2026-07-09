interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  subtitle?: string
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-normal text-[var(--app-text)]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-[var(--app-muted)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
