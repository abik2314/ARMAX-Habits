import { AnimatePresence, motion } from 'framer-motion'

interface SaveToastProps {
  message: string
}

export function SaveToast({ message }: SaveToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[var(--app-green)]/40 bg-[var(--app-card-strong)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] shadow-[0_0_28px_var(--app-glow)] backdrop-blur-2xl"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
