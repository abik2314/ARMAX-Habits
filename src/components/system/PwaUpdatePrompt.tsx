import { RefreshCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyServiceWorkerUpdate, onPwaUpdateAvailable } from '../../services/pwa'
import { AnimatedButton } from '../ui/AnimatedButton'

export function PwaUpdatePrompt() {
  const [isVisible, setVisible] = useState(false)

  useEffect(() => onPwaUpdateAvailable(() => setVisible(true)), [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom)+var(--telegram-safe-area-bottom,0px))] z-50 mx-auto w-full max-w-[480px] px-4">
      <div className="glass-surface flex items-center justify-between gap-3 rounded-[20px] p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--app-text)]">Доступно обновление</div>
          <div className="text-xs text-[var(--app-muted)]">Новая версия загрузится без удаления ваших данных.</div>
        </div>
        <AnimatedButton type="button" variant="primary" onClick={applyServiceWorkerUpdate} className="h-10 shrink-0 px-3 text-xs">
          <RefreshCcw className="h-4 w-4" />
          Обновить
        </AnimatedButton>
      </div>
    </div>
  )
}
