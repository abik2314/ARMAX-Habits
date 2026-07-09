import { Check, Lock } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { hapticImpact } from '../../services/telegram'
import { cn } from '../../utils/cn'

interface IosCheckButtonProps {
  checked: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  className?: string
}

export function IosCheckButton({ checked, disabled, label, onClick, className }: IosCheckButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 520, damping: 28 }}
      onClick={() => {
        if (!disabled) {
          hapticImpact('light')
          onClick()
        }
      }}
      className={cn(
        'relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border backdrop-blur-2xl transition-all duration-300',
        checked
          ? 'border-[var(--app-green)] bg-[var(--app-green)] text-[#04100A] shadow-[0_0_26px_var(--app-glow)]'
          : 'border-[var(--app-border)] bg-white/[0.075] text-[var(--app-muted)]',
        disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.44),transparent_32%)]" />
      <AnimatePresence mode="wait" initial={false}>
        {disabled ? (
          <motion.span
            key="locked"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="relative z-10 grid place-items-center"
          >
            <Lock className="h-5 w-5" />
          </motion.span>
        ) : checked ? (
          <motion.span
            key="checked"
            initial={{ scale: 0, rotate: -24 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 24 }}
            transition={{ type: 'spring', stiffness: 620, damping: 24 }}
            className="relative z-10 grid place-items-center"
          >
            <Check className="h-6 w-6" strokeWidth={3.2} />
          </motion.span>
        ) : (
          <motion.span
            key="empty"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="relative z-10 h-3.5 w-3.5 rounded-full border border-current"
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}
