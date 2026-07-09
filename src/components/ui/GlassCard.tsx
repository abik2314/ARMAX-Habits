import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../utils/cn'

interface GlassCardProps extends HTMLMotionProps<'section'> {
  strong?: boolean
  active?: boolean
}

export function GlassCard({ className, strong = false, active = false, children, ...props }: GlassCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className={cn(
        'glass-surface rounded-[18px] p-4 text-[var(--app-text)] transition-all duration-300',
        strong && 'bg-[var(--app-card-strong)]',
        active && 'shadow-[0_0_34px_var(--app-glow),0_18px_70px_var(--app-shadow)]',
        className,
      )}
      {...props}
    >
      {children}
    </motion.section>
  )
}
