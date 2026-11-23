import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Send, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { feedbackSchema, validateForm } from '../lib/validation/schemas'
import { sanitizeAppError } from '../lib/errorHandler'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Strict Schema Validation
    const validation = validateForm(feedbackSchema, {
      name: name.trim() || null,
      email: email.trim() || undefined,
      message: message.trim(),
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    setIsSubmitting(true)

    try {
      // Insert into user_feedback (without .select() because RLS prevents reading)
      const { error } = await supabase.from('user_feedback').insert([
        {
          name: validation.data.name || null,
          email: validation.data.email || null,
          message: validation.data.message,
        },
      ])

      if (error) throw error

      // Call the edge function directly to ensure email is sent
      await supabase.functions.invoke('send-feedback-email', {
        body: {
          name: validation.data.name || 'Anonymous',
          email: validation.data.email || 'No email provided',
          message: validation.data.message,
        },
      })

      toast.success('Your message has been sent successfully!')
      setName('')
      setEmail('')
      setMessage('')
      onClose()
    } catch (error: unknown) {
      toast.error(sanitizeAppError(error, 'Failed to send message. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            ref={modalRef}
            className="bg-nex-surface border-nex-border fixed right-6 bottom-24 z-50 flex w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border shadow-2xl"
          >
            <div className="border-nex-border bg-nex-bg/50 flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <div className="bg-nex-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <MessageCircle className="text-nex-primary h-4 w-4" />
                </div>
                <h3 className="text-nex-text text-sm font-bold">{t('support.title')}</h3>
              </div>
              <button
                onClick={onClose}
                className="text-nex-muted hover:text-nex-text hover:bg-nex-border/50 rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <div>
                <label className="text-nex-muted mb-1 ml-1 block text-xs font-semibold">
                  {t('support.nameLabel')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('support.namePlaceholder')}
                  maxLength={100}
                  className="bg-nex-bg border-nex-border text-nex-text focus:ring-nex-primary/50 w-full rounded-xl border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-nex-muted mb-1 ml-1 block text-xs font-semibold">
                  {t('support.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('support.emailPlaceholder')}
                  maxLength={255}
                  className="bg-nex-bg border-nex-border text-nex-text focus:ring-nex-primary/50 w-full rounded-xl border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-nex-muted mb-1 ml-1 block text-xs font-semibold">
                  {t('support.msgLabel')}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('support.msgPlaceholder')}
                  required
                  maxLength={2000}
                  rows={4}
                  className="bg-nex-bg border-nex-border text-nex-text focus:ring-nex-primary/50 w-full resize-none rounded-xl border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="nex-btn-primary shadow-nex-primary/20 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Send className="h-4 w-4" /> {t('support.send')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
