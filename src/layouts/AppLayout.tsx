import { AnimatePresence } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { AchievementCelebration } from '../components/achievements/AchievementCelebration'
import { UserBindingGate } from '../components/system/UserBindingGate'
import { BottomNavigation } from '../components/ui/BottomNavigation'
import { PageTransition } from '../components/ui/PageTransition'
import { useTelegramApp } from '../hooks/useTelegramApp'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import { useHabitStore } from '../store/habitsStore'
import { cn } from '../utils/cn'

export function AppLayout() {
  useTelegramApp()
  const location = useLocation()
  const settings = useHabitStore((state) => state.settings)
  const resolvedTheme = useResolvedTheme(settings.theme)
  const builtInBackgrounds = {
    aurora: '',
    forest: 'radial-gradient(circle at 20% 10%, rgba(74,222,128,0.28), transparent 30%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.18), transparent 34%)',
    city: 'radial-gradient(circle at 18% 8%, rgba(34,211,238,0.24), transparent 28%), radial-gradient(circle at 90% 16%, rgba(139,92,246,0.24), transparent 32%)',
    focus: 'radial-gradient(circle at 50% 0%, rgba(250,204,21,0.16), transparent 30%), radial-gradient(circle at 18% 18%, rgba(74,222,128,0.18), transparent 28%)',
    none: '',
  }
  const customBackground = settings.background.customImage
  const extraBackground =
    customBackground || (settings.background.builtIn !== 'aurora' ? builtInBackgrounds[settings.background.builtIn] : '')

  return (
    <div className={cn('theme-' + resolvedTheme, 'aurora-bg min-h-svh text-[var(--app-text)]')}>
      {extraBackground ? (
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: customBackground ? `url(${customBackground})` : extraBackground,
            filter: `blur(${settings.background.blur}px)`,
            opacity: 1 - settings.background.dim / 100,
          }}
        />
      ) : null}
      <main className="premium-scrollbar relative mx-auto flex min-h-svh w-full max-w-[480px] flex-col overflow-hidden border-x border-[var(--app-border)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(135deg,rgba(74,222,128,0.14),rgba(34,211,238,0.12)_44%,rgba(139,92,246,0.14))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.055)_0,rgba(255,255,255,0.055)_1px,transparent_1px,transparent_18px)] opacity-35" />
        <section className="relative flex-1 px-4 pb-28 pt-[calc(18px+env(safe-area-inset-top))]">
          <AnimatePresence mode="wait">
            <PageTransition pageKey={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </section>
        <BottomNavigation />
      </main>
      <UserBindingGate />
      {settings.modules.achievements ? <AchievementCelebration /> : null}
    </div>
  )
}
