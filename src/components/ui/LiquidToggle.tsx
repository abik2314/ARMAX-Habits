import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface LiquidToggleOption<T extends string> {
  value: T
  label: string
}

interface LiquidToggleProps<T extends string> {
  value: T
  options: LiquidToggleOption<T>[]
  onChange: (value: T) => void
  className?: string
}

export function LiquidToggle<T extends string>({ value, options, onChange, className }: LiquidToggleProps<T>) {
  return (
    <div
      className={cn(
        'grid rounded-[18px] border border-[var(--app-border)] bg-white/[0.05] p-1 shadow-inner backdrop-blur-xl',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative h-10 rounded-[14px] px-2 text-xs font-semibold transition-colors',
              isActive ? 'text-[#04100A]' : 'text-[var(--app-muted)]',
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="liquid-toggle-thumb"
                className="absolute inset-0 rounded-[14px] bg-[linear-gradient(135deg,var(--app-green),var(--app-cyan))] shadow-[0_0_22px_var(--app-glow)]"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
