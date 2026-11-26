import { useState, useTransition } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, getRememberMePreference, setRememberMePreference } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSEO } from '../../hooks/useSEO'
import { loginSchema, validateForm } from '../../lib/validation/schemas'
import { checkRateLimit, recordRateLimitAttempt } from '../../lib/rateLimiter'
import { sanitizeAppError } from '../../lib/errorHandler'
import { formatNumber } from '../../lib/utils'
import AuthLayout from './components/AuthLayout'

const VALIDATION_ERROR_KEYS: Record<string, string> = {
  'Email is required': 'auth.login.errors.emailRequired',
  'Please enter a valid email address': 'auth.login.errors.emailInvalid',
  'Email cannot exceed 255 characters': 'auth.login.errors.emailTooLong',
  'Password is required': 'auth.login.errors.passwordRequired',
  'Password cannot exceed 72 characters': 'auth.login.errors.passwordTooLong',
}

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')

  useSEO({
    title: t('auth.login.seoTitle'),
    description: t('auth.login.seoDesc'),
    canonical: 'https://www.nexmess.shop/login',
    robots: 'index, follow',
  })

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlErrorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference())
  const [isPending, startTransition] = useTransition()
  const [googlePending, startGoogleTransition] = useTransition()
  const [cooldownSec, setCooldownSec] = useState<number>(0)

  const localizeSanitizedError = (err: unknown): string => {
    const msg = sanitizeAppError(err)
    if (!isBangla) return msg
    const lower = msg.toLowerCase()
    if (lower.includes('invalid email or password')) return t('auth.login.errors.invalidCredentials')
    if (lower.includes('verify your email')) return t('auth.login.errors.emailNotConfirmed')
    if (lower.includes('too many') || lower.includes('rate limit')) return t('auth.login.errors.rateLimit')
    if (lower.includes('network connection')) return t('auth.login.errors.network')
    if (lower.includes('unexpected error')) return t('auth.login.errors.generic')
    return msg
  }

  const handleEmailLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 1. Strict Schema Validation
    const validation = validateForm(loginSchema, { email, password })
    if (!validation.success) {
      const key = VALIDATION_ERROR_KEYS[validation.error]
      toast.error(key ? t(key) : validation.error)
      return
    }

    // 2. Client-Side Rate Limiter Check (Exponential Backoff)
    const rateLimitKey = `login:${email.toLowerCase().trim()}`
    const rlStatus = checkRateLimit(rateLimitKey)
    if (!rlStatus.allowed) {
      setCooldownSec(rlStatus.retryAfterSec)
      toast.error(t('auth.login.rateLimitToast', { sec: formatNumber(rlStatus.retryAfterSec) }))
      return
    }

    startTransition(async () => {
      try {
        setRememberMePreference(rememberMe)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        })

        if (error) {
          recordRateLimitAttempt(rateLimitKey, false)
          toast.error(localizeSanitizedError(error))
          const newRl = checkRateLimit(rateLimitKey)
          if (!newRl.allowed) {
            setCooldownSec(newRl.retryAfterSec)
          }
        } else {
          recordRateLimitAttempt(rateLimitKey, true)
          setCooldownSec(0)
          if (data?.session) {
            useAuthStore.getState().setSession(data.session)
            await useAuthStore.getState().fetchProfile()
          }
          toast.success(t('auth.login.welcomeToast'))
          navigate('/dashboard')
        }
      } catch (err: unknown) {
        recordRateLimitAttempt(rateLimitKey, false)
        toast.error(localizeSanitizedError(err))
      }
    })
  }

  const handleGoogleLogin = () => {
    startGoogleTransition(async () => {
      try {
        setRememberMePreference(rememberMe)
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/dashboard` },
        })
        if (error) {
          toast.error(localizeSanitizedError(error))
        }
      } catch (err: unknown) {
        toast.error(localizeSanitizedError(err))
      }
    })
  }

  const features = [
    t('auth.login.featureMeals'),
    t('auth.login.featureExpenseSplit'),
    t('auth.login.featureMealRate'),
    t('auth.login.featureMemberLogs'),
  ]

  const labelClass = `text-nex-text/85 mb-1.5 block font-semibold ${
    isBangla ? 'text-xs' : 'text-[11px] tracking-wider uppercase'
  }`

  const alertBanner =
    cooldownSec > 0 ? (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span>{t('auth.login.cooldownWarning', { sec: formatNumber(cooldownSec) })}</span>
      </div>
    ) : urlErrorParam ? (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span>{localizeSanitizedError(urlErrorParam)}</span>
      </div>
    ) : null

  return (
    <AuthLayout
      heroBadge={t('auth.login.heroBadge')}
      heroBadgeTag="BD"
      heroTitleLine1={t('auth.login.heroTitleLine1')}
      heroTitleLine2={t('auth.login.heroTitleLine2')}
      heroDesc={t('auth.login.heroDesc')}
      heroFeatures={features}
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      googleLabel={googlePending ? t('auth.login.redirecting') : t('auth.login.google')}
      googlePending={googlePending}
      googleDisabled={cooldownSec > 0}
      googleButtonId="google-login-btn"
      onGoogleClick={handleGoogleLogin}
      orDividerLabel={t('auth.login.orEmail')}
      alertBanner={alertBanner}
      footerPrompt={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/register"
            className="text-nex-text hover:text-nex-primary font-semibold transition-colors hover:underline"
          >
            {t('auth.login.createAccount')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className={labelClass}>
            {t('auth.login.email')}
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
              id="login-email"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="login-password" className={`${labelClass} mb-0`}>
              {t('auth.login.password')}
            </label>
            <Link
              to="/forgot-password"
              className="text-nex-text hover:text-nex-primary text-xs font-semibold transition-colors"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <Lock className="text-nex-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="nex-input rounded-xl py-2.5 pr-10 pl-10 sm:py-3"
              placeholder="••••••••"
              required
              id="login-password"
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

        <div className="flex flex-wrap items-center justify-between gap-2 py-0.5">
          <label
            htmlFor="remember-me"
            className="text-nex-text/90 inline-flex cursor-pointer items-center gap-2 text-xs font-medium select-none"
          >
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="border-nex-border bg-nex-surface accent-nex-primary focus:ring-nex-primary h-4 w-4 cursor-pointer rounded dark:accent-emerald-500"
            />
            <span>{t('auth.login.rememberMe')}</span>
          </label>

          <span className="text-nex-muted inline-flex items-center gap-1 text-xs">
            <ShieldCheck className="text-nex-primary/80 h-3.5 w-3.5 dark:text-emerald-400/80" />
            <span>{t('auth.login.securityBadge')}</span>
          </span>
        </div>

        <button
          type="submit"
          disabled={isPending || cooldownSec > 0}
          className="nex-btn-primary w-full rounded-xl py-3 text-sm font-semibold shadow-[0_6px_16px_-4px_rgba(53,83,64,0.4)] disabled:opacity-50"
          id="login-submit"
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>{t('auth.login.submit')}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
