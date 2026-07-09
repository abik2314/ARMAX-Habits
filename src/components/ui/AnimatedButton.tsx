import { motion, type HTMLMotionProps } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { hapticImpact } from '../../services/telegram'
import { cn } from '../../utils/cn'

interface Ripple {
  id: number
  x: number
  y: number
}

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode
  variant?: 'primary' | 'glass' | 'ghost' | 'danger'
  haptic?: boolean
}

export function AnimatedButton({
  className,
  children,
  variant = 'glass',
  haptic = false,
  onPointerDown,
  ...props
}: AnimatedButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 430, damping: 24 }}
      className={cn(
        'liquid-button relative inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary' && 'bg-[linear-gradient(135deg,var(--app-green),var(--app-cyan))] text-[#04100A]',
        variant === 'ghost' && 'border-transparent bg-transparent shadow-none',
        variant === 'danger' && 'border-rose-400/35 bg-rose-500/12 text-rose-200',
        className,
      )}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const ripple = {
          id: Date.now(),
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }
        setRipples((current) => [...current.slice(-2), ripple])
        window.setTimeout(() => {
          setRipples((current) => current.filter((item) => item.id !== ripple.id))
        }, 520)

        if (haptic) {
          hapticImpact('light')
        }

        onPointerDown?.(event)
      }}
      {...props}
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="pointer-events-none absolute h-24 w-24 rounded-full bg-white/28"
          style={{ left: ripple.x - 48, top: ripple.y - 48 }}
          initial={{ scale: 0, opacity: 0.55 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.52, ease: 'easeOut' }}
        />
      ))}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  )
}
