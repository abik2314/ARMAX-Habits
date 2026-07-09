import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface AnimatedProgressProps {
  value: number
  className?: string
  heightClassName?: string
}

export function AnimatedProgress({ value, className, heightClassName = 'h-2.5' }: AnimatedProgressProps) {
  const normalized = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('overflow-hidden rounded-full bg-black/10 dark:bg-white/[0.07]', heightClassName, className)}>
      <motion.div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--app-green),var(--app-cyan),var(--app-purple))] shadow-[0_0_22px_var(--app-glow)]"
        initial={{ width: 0 }}
        animate={{ width: `${normalized}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  )
}
