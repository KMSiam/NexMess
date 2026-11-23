import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  /** If set, user must type this exact string to confirm */
  confirmInput?: string
  confirmInputLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const variantStyles = {
  danger: {
    icon: 'bg-nex-danger-light text-nex-danger',
    btn: 'nex-btn-danger',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-500',
    btn: 'nex-btn-primary',
  },
  info: {
    icon: 'bg-nex-primary-light text-nex-primary',
    btn: 'nex-btn-primary',
  },
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  confirmInput,
  confirmInputLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const displayConfirmText = confirmText || t('common.confirm')
  const displayCancelText = cancelText || t('common.cancel')
  const [inputValue, setInputValue] = useState('')
  const styles = variantStyles[variant]
  const needsInput = Boolean(confirmInput)
  const inputMatches = !needsInput || inputValue === confirmInput

  const handleConfirm = () => {
    if (!inputMatches) return
    setInputValue('')
    onConfirm()
  }

  const handleCancel = () => {
    setInputValue('')
    onCancel()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="nex-card w-full max-w-md p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-4 flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-nex-text text-lg font-semibold">{title}</h3>
                  <p className="text-nex-muted mt-1 text-sm leading-relaxed">{message}</p>
                </div>
                <button
                  onClick={handleCancel}
                  className="rounded-btn text-nex-muted hover:bg-nex-hover shrink-0 p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Optional confirmation input */}
              {needsInput && (
                <div className="mb-4">
                  <label className="text-nex-text mb-1 block text-sm font-medium">
                    {confirmInputLabel || `Type "${confirmInput}" to confirm`}
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="nex-input text-sm"
                    placeholder={confirmInput}
                    autoFocus
                  />
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={handleCancel} className="nex-btn-secondary">
                  {displayCancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!inputMatches}
                  className={`${styles.btn} disabled:opacity-50`}
                >
                  {displayConfirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
