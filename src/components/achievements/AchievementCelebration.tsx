import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { useHabitStore } from '../../store/habitsStore'
import type { Achievement } from '../../types/habit'
import { normalizeSettings } from '../../utils/habits'
import { getAchievementResults, getBaseStats } from '../../utils/stats'
import { AchievementModal } from './AchievementModal'

export function AchievementCelebration() {
  const habits = useHabitStore((state) => state.habits)
  const moodEntries = useHabitStore((state) => state.moodEntries)
  const rawSettings = useHabitStore((state) => state.settings)
  const settings = useMemo(() => normalizeSettings(rawSettings), [rawSettings])
  const workLogs = useHabitStore((state) => state.workLogs)
  const awards = useHabitStore((state) => state.awards)
  const lastCelebration = useHabitStore((state) => state.lastCelebration)
  const dismissCelebration = useHabitStore((state) => state.dismissCelebration)
  const achievement = useMemo(() => {
    const award = awards.find((item) => item.id === lastCelebration)
    if (award) {
      return {
        id: award.id,
        title: award.title,
        description: `${award.description} +${award.starsRewarded}⭐`,
        icon: award.icon,
        accent: '#FBBF24',
        progress: 1,
        target: 1,
        isUnlocked: true,
      } satisfies Achievement
    }

    const stats = getBaseStats(habits, undefined, moodEntries, settings, workLogs)
    return getAchievementResults(habits, stats).find((item) => item.id === lastCelebration)
  }, [awards, habits, lastCelebration, moodEntries, settings, workLogs])

  useEffect(() => {
    if (!lastCelebration) {
      return
    }

    const timer = window.setTimeout(() => dismissCelebration(), 2800)
    return () => window.clearTimeout(timer)
  }, [dismissCelebration, lastCelebration])

  return (
    <AnimatePresence>
      {achievement ? <AchievementModal achievement={achievement} /> : null}
    </AnimatePresence>
  )
}
