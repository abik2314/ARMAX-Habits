import { CalendarDays, ChartNoAxesCombined, Home, UserRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { hapticSelection } from '../../services/telegram'
import { cn } from '../../utils/cn'

const navItems = [
  { to: '/', label: 'Сегодня', icon: Home },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays },
  { to: '/stats', label: 'Статистика', icon: ChartNoAxesCombined },
  { to: '/profile', label: 'Профиль', icon: UserRound },
]

export function BottomNavigation() {
  const location = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] px-3 pb-[calc(10px+env(safe-area-inset-bottom)+var(--telegram-safe-area-bottom,0px))] pt-2">
      <div className="glass-surface grid grid-cols-4 gap-1 rounded-[24px] p-1.5">
        {navItems.map((item) => {
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => hapticSelection()}
              className="relative flex h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] font-medium transition-colors"
            >
              {isActive ? (
                <>
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-[18px] bg-[linear-gradient(135deg,rgba(74,222,128,0.18),rgba(34,211,238,0.12))]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                  <motion.span
                    layoutId="bottom-nav-drop"
                    className="absolute -bottom-1 h-1.5 w-9 rounded-full bg-[var(--app-green)] shadow-[0_0_18px_var(--app-glow)]"
                  />
                </>
              ) : null}
              <motion.span animate={{ scale: isActive ? 1.12 : 1 }} className="relative z-10">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-[var(--app-green)]' : 'text-[var(--app-muted)]',
                  )}
                />
              </motion.span>
              <span className={cn('relative z-10', isActive ? 'text-[var(--app-text)]' : 'text-[var(--app-muted)]')}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
