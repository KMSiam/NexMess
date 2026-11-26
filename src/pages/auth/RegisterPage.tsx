import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, setRememberMePreference } from '../../lib/supabase'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSEO } from '../../hooks/useSEO'
import { registerSchema, validateForm } from '../../lib/validation/schemas'
import { checkRateLimit, recordRateLimitAttempt } from '../../lib/rateLimiter'
import { sanitizeAppError } from '../../lib/errorHandler'
import { formatNumber } from '../../lib/utils'
import AuthLayout from './components/AuthLayout'

const VALIDATION_ERROR_KEYS: Record<string, string> = {
  'Email is required': 'auth.register.errors.emailRequired',
  'Please enter a valid email address': 'auth.register.errors.emailInvalid',
  'Email cannot exceed 255 characters': 'auth.register.errors.emailTooLong',
  'Password must be at least 8 characters long': 'auth.register.errors.passwordMin',
  'Password cannot exceed 72 characters': 'auth.register.errors.passwordTooLong',
  'Password must contain at least one letter': 'auth.register.errors.passwordLetter',
  'Password must contain at least one number': 'auth.register.errors.passwordNumber',
  'Please confirm your password': 'auth.register.errors.confirmRequired',
  'You must agree to the Terms of Service and Privacy Policy': 'auth.register.errors.mustAgreeTerms',
  'Passwords do not match': 'auth.register.errors.passwordsMismatch',
}

export default function RegisterPage() {
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')

  useSEO({
    title: t('auth.register.seoTitle'),
    description: t('auth.register.seoDesc'),
    canonical: 'https://www.nexmess.shop/register',
    robots: 'index, follow',
  })

  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [cooldownSec, setCooldownSec] = useState<number>(0)

  const localizeSanitizedError = (err: unknown): string => {
    const msg = sanitizeAppError(err)
    if (!isBangla) return msg
    const lower = msg.toLowerCase()
    if (lower.includes('already exists') || lower.includes('already registered')) {
      return t('auth.register.errors.alreadyRegistered')
    }
    if (lower.includes('too many') || lower.includes('rate limit')) {
      return t('auth.register.errors.rateLimit')
    }
    if (lower.includes('network connection')) return t('auth.register.errors.network')
    if (lower.includes('unexpected error')) return t('auth.register.errors.generic')
    return msg
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 1. Strict Schema Validation
    const validation = validateForm(registerSchema, {
      email,
      password,
      confirmPassword,
      agreeTerms,
    })

    if (!validation.success) {
      const key = VALIDATION_ERROR_KEYS[validation.error]
      toast.error(key ? t(key) : validation.error)
      return
    }

    // 2. Client-Side Rate Limiter Check (Exponential Backoff)
    const rateLimitKey = `register:${email.toLowerCase().trim()}`
    const rlStatus = checkRateLimit(rateLimitKey)
    if (!rlStatus.allowed) {
      setCooldownSec(rlStatus.retryAfterSec)
      toast.error(t('auth.register.rateLimitToast', { sec: formatNumber(rlStatus.retryAfterSec) }))
      return
    }

    setLoading(true)
    try {
      setRememberMePreference(true)
      const { data, error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })

      if (error) {
        recordRateLimitAttempt(rateLimitKey, false)
        toast.error(localizeSanitizedError(error))
        const newRl = checkRateLimit(rateLimitKey)
        if (!newRl.allowed) setCooldownSec(newRl.retryAfterSec)
      } else if (data?.user?.identities && data.user.identities.length === 0) {
        recordRateLimitAttempt(rateLimitKey, false)
        setCooldownSec(0)
        toast.success(t('auth.register.verificationSentExisting'))
        navigate('/verify-email', { state: { email: validation.data.email } })
      } else {
        recordRateLimitAttempt(rateLimitKey, true)
        setCooldownSec(0)
        toast.success(t('auth.register.verificationSent'))
        navigate('/verify-email', { state: { email: validation.data.email } })
      }
    } catch (err: unknown) {
      recordRateLimitAttempt(rateLimitKey, false)
      toast.error(localizeSanitizedError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!agreeTerms) {
      toast.error(t('auth.register.mustAgreeTerms'))
      return
    }
    setGoogleLoading(true)
    try {
      setRememberMePreference(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) {
        toast.error(localizeSanitizedError(error))
        setGoogleLoading(false)
      }
    } catch (err: unknown) {
      toast.error(localizeSanitizedError(err))
      setGoogleLoading(false)
    }
  }

  const features = [
    t('auth.register.featureMath'),
    t('auth.register.featureBalance'),
    t('auth.register.featureBazaar'),
    t('auth.register.featureDuty'),
    t('auth.register.featureBilingual'),
  ]

  const labelClass = `text-nex-text/85 mb-1.5 block font-semibold ${
    isBangla ? 'text-xs' : 'text-[11px] tracking-wider uppercase'
  }`

  const alertBanner =
    cooldownSec > 0 ? (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span>{t('auth.register.cooldownWarning', { sec: formatNumber(cooldownSec) })}</span>
      </div>
    ) : null

  return (
    <AuthLayout
      heroBadge={t('auth.register.heroBadge')}
      heroTitleLine1={t('auth.register.heroTitleLine1')}
      heroTitleLine2={t('auth.register.heroTitleLine2')}
      heroUnderlineSecondLine
      heroDesc={t('auth.register.heroDesc')}
      heroFeatures={features}
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      googleLabel={googleLoading ? t('auth.register.redirecting') : t('auth.register.google')}
      googlePending={googleLoading}
      googleDisabled={cooldownSec > 0}
      googleButtonId="google-register-btn"
      onGoogleClick={handleGoogleSignup}
      orDividerLabel={t('auth.register.orEmail')}
      alertBanner={alertBanner}
      footerPrompt={
        <>
          {t('auth.register.haveAccount')}{' '}
          <Link
            to="/login"
            className="text-nex-text hover:text-nex-primary font-semibold transition-colors hover:underline"
          >
            {t('auth.register.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="register-email" className={labelClass}>
            {t('auth.register.email')}
          </label>
          <div className="relative">
            <Mail className="text-nex-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="nex-input rounded-xl py-2.5 pl-10 sm:py-3"
              placeholder="you@example.com"
              required
              id="register-email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className={labelClass}>
            {t('auth.register.password')}
          </label>
          <div className="relative">
            <Lock className="text-nex-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="nex-input rounded-xl py-2.5 pr-10 pl-10 sm:py-3"
              placeholder={t('auth.register.passwordPlaceholder')}
              required
              id="register-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
              className="text-nex-muted hover:text-nex-text absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="register-confirm-password" className={labelClass}>
            {t('auth.register.confirmPassword')}
          </label>
          <div className="relative">
            <ShieldCheck className="text-nex-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="nex-input rounded-xl py-2.5 pl-10 sm:py-3"
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              required
              id="register-confirm-password"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 py-1">
          <input
            type="checkbox"
            id="agree-terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="border-nex-border bg-nex-surface accent-nex-primary focus:ring-nex-primary mt-0.5 h-4 w-4 cursor-pointer rounded dark:accent-emerald-500"
            required
          />
          <label
            htmlFor="agree-terms"
            className="text-nex-muted cursor-pointer text-xs leading-normal select-none"
          >
            {t('auth.register.agreeTerms')}{' '}
            <Link
              to="/terms-of-service"
              className="text-nex-text hover:text-nex-primary font-semibold transition-colors hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('auth.register.terms')}
            </Link>{' '}
            {t('auth.register.and')}{' '}
            <Link
              to="/privacy-policy"
              className="text-nex-text hover:text-nex-primary font-semibold transition-colors hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('auth.register.privacy')}
            </Link>
            .
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || cooldownSec > 0}
          className="nex-btn-primary w-full rounded-xl py-3 text-sm font-semibold shadow-[0_6px_16px_-4px_rgba(53,83,64,0.4)] disabled:opacity-50"
          id="register-submit"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>{t('auth.register.submit')}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
