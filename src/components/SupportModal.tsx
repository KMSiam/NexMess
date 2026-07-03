import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
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
    if (!message.trim()) {
      toast.error('Message is required')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Insert into user_feedback (without .select() because RLS prevents reading)
      const { error } = await supabase
        .from('user_feedback')
        .insert([{ name, email, message }])
        
      if (error) throw error

      // Call the edge function directly to ensure email is sent
      await supabase.functions.invoke('send-feedback-email', {
        body: { name, email, message }
      })
      
      toast.success('Your message has been sent successfully!')
      setName('')
      setEmail('')
      setMessage('')
      onClose()
    } catch (error: any) {
      console.error('Feedback error:', error)
      toast.error('Failed to send message. Please try again.')
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            ref={modalRef}
            className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-sm bg-nex-surface border border-nex-border shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-nex-border bg-nex-bg/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-nex-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-nex-primary" />
                </div>
                <h3 className="font-bold text-nex-text text-sm">Support & Contact</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-nex-muted hover:text-nex-text hover:bg-nex-border/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-nex-muted mb-1 ml-1">Name (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-nex-bg border border-nex-border rounded-xl px-3 py-2 text-sm text-nex-text focus:outline-none focus:ring-2 focus:ring-nex-primary/50 transition-all"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-nex-muted mb-1 ml-1">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-nex-bg border border-nex-border rounded-xl px-3 py-2 text-sm text-nex-text focus:outline-none focus:ring-2 focus:ring-nex-primary/50 transition-all"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-nex-muted mb-1 ml-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  required
                  rows={4}
                  className="w-full bg-nex-bg border border-nex-border rounded-xl px-3 py-2 text-sm text-nex-text focus:outline-none focus:ring-2 focus:ring-nex-primary/50 transition-all resize-none"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full nex-btn-primary py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-lg shadow-nex-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Message
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
