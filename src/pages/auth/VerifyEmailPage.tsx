import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MailCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useSEO } from '../../hooks/useSEO'
import { sanitizeAppError } from '../../lib/errorHandler'

const COOLDOWN = 60

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  useSEO({
    title: 'Verify Your Email',
    description: 'Verify your email address to activate your NexMess account.',
    robots: 'noindex, nofollow',
  })
  const location = useLocation()
  const email = (location.state as { email?: string })?.email ?? ''

  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (!email) {
      toast.error('Email address not found. Please go back and register again.')
      return
    }
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    })
    setResending(false)
    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to resend verification email.'))
    } else {
      toast.success('Verification email resent!')
      setCooldown(COOLDOWN)
    }
  }

  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center p-6">
      <div className="nex-card w-full max-w-md p-8 text-center">
        <div className="bg-nex-primary-light mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <MailCheck className="text-nex-primary h-8 w-8" />
        </div>
        <h1 className="text-nex-text mb-2 text-2xl font-bold">{t('auth.verifyEmail.title')}</h1>
        <p className="text-nex-muted mb-2 leading-relaxed">
          {t('auth.verifyEmail.subtitle')}{' '}
          {email ? <strong className="text-nex-text">({email})</strong> : ''}
        </p>
        <p className="text-nex-muted mb-6 text-sm">
          {t('auth.verifyEmail.spamNotice')}
        </p>

        <div className="nex-card bg-nex-elevated mb-6 p-4">
          <p className="text-nex-muted mb-3 text-sm">{t('auth.verifyEmail.didNotReceive')}</p>
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="nex-btn-secondary w-full justify-center gap-2 disabled:opacity-50"
            id="resend-verification-btn"
          >
            {resending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {cooldown > 0
              ? t('auth.verifyEmail.resendIn', { sec: cooldown })
              : t('auth.verifyEmail.resend')}
          </button>
        </div>

        <Link to="/login" className="nex-btn-secondary w-full justify-center" id="back-to-login">
          {t('auth.verifyEmail.backToLogin')}
        </Link>
      </div>
    </div>
  )
}
