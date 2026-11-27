import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Mail, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'
import { useSEO } from '../../hooks/useSEO'
import { forgotPasswordSchema, validateForm } from '../../lib/validation/schemas'
import { checkRateLimit, recordRateLimitAttempt } from '../../lib/rateLimiter'
import { sanitizeAppError } from '../../lib/errorHandler'

const COOLDOWN = 60

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  useSEO({
    title: 'Forgot Password',
    description: 'Reset your NexMess account password to regain access to your mess management dashboard.',
    robots: 'noindex, nofollow',
  })
  const [searchParams] = useSearchParams()
  const isExpired = searchParams.get('expired') === '1'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const sendReset = async (emailToSend: string) => {
    // 1. Validation
    const validation = validateForm(forgotPasswordSchema, { email: emailToSend })
    if (!validation.success) {
      toast.error(validation.error)
      return false
    }

    // 2. Rate Limiting Check
    const rateLimitKey = `forgot_password:${emailToSend.toLowerCase().trim()}`
    const rlStatus = checkRateLimit(rateLimitKey, {
      maxAttemptsBeforeDelay: 2,
      initialDelayMs: 5000,
      multiplier: 2,
      maxDelayMs: 60000,
    })

    if (!rlStatus.allowed) {
      setRateLimitCooldown(rlStatus.retryAfterSec)
      toast.error(rlStatus.message || 'Too many reset attempts. Please wait.')
      return false
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(validation.data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      setLoading(false)
      if (error) {
        recordRateLimitAttempt(rateLimitKey, false)
        toast.error(sanitizeAppError(error))
        const newRl = checkRateLimit(rateLimitKey)
        if (!newRl.allowed) setRateLimitCooldown(newRl.retryAfterSec)
        return false
      }
      recordRateLimitAttempt(rateLimitKey, true)
      setRateLimitCooldown(0)
      return true
    } catch (err: unknown) {
      setLoading(false)
      recordRateLimitAttempt(rateLimitKey, false)
      toast.error(sanitizeAppError(err))
      return false
    }
  }

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const ok = await sendReset(email)
    if (ok) {
      toast.success('Password reset link sent!')
      setSent(true)
      setCooldown(COOLDOWN)
    }
  }

  const handleResend = async () => {
    const ok = await sendReset(email)
    if (ok) {
      toast.success('Reset link resent!')
      setCooldown(COOLDOWN)
    }
  }

  return (
    <div className="bg-nex-bg flex min-h-screen">
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#3A5643] via-[#4A6D56] to-[#5F886E] p-12 text-white lg:flex">
        <div className="max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur">
              <img src={logoIcon} alt="NexMess" className="h-10 w-10" />
            </div>
            <span className="text-3xl font-bold">NexMess</span>
          </div>
          <p className="mb-4 text-4xl leading-tight font-bold text-white">{t('auth.forgotPassword.heroTitle')}</p>
          <p className="text-lg leading-relaxed text-[#EDF2EE]">
            {t('auth.forgotPassword.heroDesc')}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              <img src={logoIcon} alt="NexMess" className="h-full w-full" />
            </div>
            <span className="text-nex-text text-2xl font-bold">NexMess</span>
          </div>

          <Link
            to="/login"
            className="text-nex-muted hover:text-nex-primary mb-6 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t('auth.forgotPassword.backToLogin')}
          </Link>

          <h1 className="text-nex-text mb-1 text-2xl font-bold">{t('auth.forgotPassword.title')}</h1>

          {rateLimitCooldown > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>Please wait {rateLimitCooldown}s before requesting another reset email.</span>
            </div>
          )}

          {isExpired && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t('auth.forgotPassword.expiredTitle')}
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  {t('auth.forgotPassword.expiredDesc')}
                </p>
              </div>
            </div>
          )}

          {sent ? (
            <div className="mt-4 space-y-4">
              <div className="border-nex-success/25 bg-nex-success-light rounded-xl border p-4">
                <p className="text-nex-success text-sm font-medium">
                  ✅ {t('auth.forgotPassword.sentDesc')} ({email})
                </p>
              </div>

              <div className="nex-card bg-nex-elevated p-4">
                <p className="text-nex-muted mb-3 text-sm">{t('auth.forgotPassword.didNotReceive')}</p>
                <button
                  onClick={handleResend}
                  disabled={loading || cooldown > 0 || rateLimitCooldown > 0}
                  className="nex-btn-secondary w-full justify-center gap-2 disabled:opacity-50"
                  id="resend-reset-btn"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {cooldown > 0
                    ? t('auth.forgotPassword.resendIn', { sec: cooldown })
                    : t('auth.forgotPassword.resend')}
                </button>
              </div>

              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-nex-muted hover:text-nex-primary w-full text-center text-sm transition-colors"
              >
                {t('auth.forgotPassword.differentEmail')}
              </button>
            </div>
          ) : (
            <>
              <p className="text-nex-muted mb-8">
                {t('auth.forgotPassword.subtitle')}
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-nex-text mb-1.5 block text-sm font-medium">
                    {t('auth.forgotPassword.email')}
                  </label>
                  <div className="relative">
                    <Mail className="text-nex-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="nex-input pl-10"
                      placeholder="you@example.com"
                      required
                      id="forgot-password-email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || rateLimitCooldown > 0}
                  className="nex-btn-primary w-full py-3 disabled:opacity-50"
                  id="forgot-password-submit"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      {t('auth.forgotPassword.submit')} <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
