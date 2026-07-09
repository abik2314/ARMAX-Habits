import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import type { Achievement } from '../../types/habit'

interface AchievementModalProps {
  achievement: Achievement
}

const particles = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  x: (index % 7) * 34 - 102,
  y: Math.floor(index / 7) * -34 - 36,
  delay: (index % 5) * 0.025,
  color: ['#4ADE80', '#22D3EE', '#8B5CF6', '#FBBF24', '#FB7185'][index % 5],
}))

export function AchievementModal({ achievement }: AchievementModalProps) {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      <div className="relative">
        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{ backgroundColor: particle.color }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: particle.x, y: particle.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
            transition={{ duration: 1.25, delay: particle.delay, ease: 'easeOut' }}
          />
        ))}
        <motion.div
          initial={{ y: 20, scale: 0.92 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 18, scale: 0.94 }}
          className="glass-surface w-[min(330px,90vw)] rounded-[26px] p-5 text-center"
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[linear-gradient(135deg,var(--app-green),var(--app-cyan))] text-[#04100A] shadow-[0_0_34px_var(--app-glow)]">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="mt-4 text-xl font-semibold text-[var(--app-text)]">{achievement.title}</div>
          <div className="mt-1 text-sm text-[var(--app-muted)]">{achievement.description}</div>
        </motion.div>
      </div>
    </motion.div>
  )
}
