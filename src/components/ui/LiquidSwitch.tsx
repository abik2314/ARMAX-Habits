import { motion } from 'framer-motion'
import { hapticSelection } from '../../services/telegram'
import { cn } from '../../utils/cn'

interface LiquidSwitchProps {
  checked: boolean
  label: string
  description?: string
  onChange: (checked: boolean) => void
  className?: string
}

export function LiquidSwitch({ checked, label, description, onChange, className }: LiquidSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticSelection()
        onChange(!checked)
      }}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--app-border)] bg-white/[0.045] p-3 text-left transition-colors',
        checked && 'border-[var(--app-green)]/50 bg-[var(--app-green)]/10',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--app-text)]">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-[var(--app-muted)]">{description}</span> : null}
      </span>
      <span
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-[var(--app-green)] bg-[var(--app-green)]/32 shadow-[0_0_18px_var(--app-glow)]'
            : 'border-[var(--app-border)] bg-white/[0.06]',
        )}
      >
        <motion.span
          animate={{ x: checked ? 24 : 3 }}
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          className="absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--app-text)] shadow-[0_4px_14px_var(--app-shadow)]"
        />
      </span>
    </button>
  )
}
