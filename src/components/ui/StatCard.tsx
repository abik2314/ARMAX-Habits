import type { LucideIcon } from 'lucide-react'
import { GlassCard } from './GlassCard'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  accent: string
  helper?: string
}

export function StatCard({ icon: Icon, label, value, accent, helper }: StatCardProps) {
  return (
    <GlassCard className="p-3">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-[var(--app-border)]"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold leading-tight text-[var(--app-text)]">{value}</div>
          <div className="truncate text-xs text-[var(--app-muted)]">{label}</div>
          {helper ? <div className="truncate text-[11px] text-[var(--app-green)]">{helper}</div> : null}
        </div>
      </div>
    </GlassCard>
  )
}
