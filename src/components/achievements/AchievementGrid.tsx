import {
  Briefcase,
  CigaretteOff,
  Flame,
  Medal,
  ShieldCheck,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { Achievement } from '../../types/habit'
import { cn } from '../../utils/cn'

const achievementIconMap: Record<Achievement['icon'], LucideIcon> = {
  flame: Flame,
  trophy: Trophy,
  shield: ShieldCheck,
  'cigarette-off': CigaretteOff,
  briefcase: Briefcase,
  medal: Medal,
  star: Star,
}

interface AchievementGridProps {
  achievements: Achievement[]
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  return (
    <div className="grid gap-2">
      {achievements.map((achievement) => {
        const Icon = achievementIconMap[achievement.icon]
        const progress = Math.round((achievement.progress / achievement.target) * 100)

        return (
          <article
            key={achievement.id}
            className={cn(
              'rounded-[20px] border p-3 transition-colors',
              achievement.isUnlocked
                ? 'border-[var(--app-border)] bg-white/[0.075] shadow-[0_0_22px_var(--app-glow)]'
                : 'border-[var(--app-border)] bg-white/[0.04] opacity-[0.78]',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-[var(--app-border)]"
                style={{ backgroundColor: `${achievement.accent}18`, color: achievement.accent }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-[var(--app-text)]">{achievement.title}</h3>
                  <span className="text-xs text-[var(--app-muted)]">
                    {achievement.progress}/{achievement.target}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--app-muted)]">{achievement.description}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${achievement.accent}, var(--app-purple))`,
                    }}
                  />
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
