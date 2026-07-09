import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { AnimatedButton } from './AnimatedButton'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            initial={{ scale: 0.94, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass-surface w-full max-w-[340px] rounded-[26px] p-4"
          >
            <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-rose-500/14 text-rose-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--app-muted)]">{description}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <AnimatedButton type="button" onClick={onCancel} className="h-11">
                Отмена
              </AnimatedButton>
              <AnimatedButton haptic type="button" onClick={onConfirm} variant="danger" className="h-11">
                {confirmLabel}
              </AnimatedButton>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
