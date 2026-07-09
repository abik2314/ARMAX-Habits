import { motion } from 'framer-motion'

interface ProgressRingProps {
  value: number
  size?: number
  stroke?: number
  label?: string
}

export function ProgressRing({ value, size = 110, stroke = 9, label = 'дня' }: ProgressRingProps) {
  const normalized = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (normalized / 100) * circumference }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#4ADE80" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold leading-none text-[var(--app-text)]">{normalized}%</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]">
          {label}
        </div>
      </div>
    </div>
  )
}
