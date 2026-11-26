import { useState, useTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, Sun, Moon } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'
import { useSEO } from '../../hooks/useSEO'
import { loginSchema, validateForm } from '../../lib/validation/schemas'
import { checkRateLimit, recordRateLimitAttempt } from '../../lib/rateLimiter'
import { sanitizeAppError } from '../../lib/errorHandler'
import { formatNumber } from '../../lib/utils'
import LanguageSwitcher from '../../components/LanguageSwitcher'

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
  const { isDark, toggleTheme } = useThemeStore()

  useSEO({
    title: t('auth.login.seoTitle'),
    description: t('auth.login.seoDesc'),
    canonical: 'https://www.nexmess.shop/login',
    robots: 'index, follow',
  })

  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const brandName = isBangla ? t('common.appName') : 'NexMess'
  const features = [
    t('auth.login.featureMeals'),
    t('auth.login.featureBilling'),
    t('auth.login.featureChat'),
  ]

  return (
    <div className={`bg-nex-bg flex min-h-screen ${isBangla ? 'font-bangla' : 'font-sans'}`}>
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#3A5643] via-[#4A6D56] to-[#5F886E] p-12 text-white lg:flex">
        <div className="max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-85">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur">
              <img src={logoIcon} alt={brandName} className="h-10 w-10" />
            </div>
            <span className="text-3xl font-bold">{brandName}</span>
          </Link>
          <h2 className="mb-4 text-4xl leading-tight font-bold">
            {t('auth.login.heroTitleLine1')}
            <br />
            {t('auth.login.heroTitleLine2')}
          </h2>
          <p className="text-lg leading-relaxed text-[#EDF2EE]">
            {t('auth.login.heroDesc')}
          </p>
          <div className="mt-10 flex flex-wrap gap-6">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-[#EDF2EE]">
                <div className="bg-nex-success h-1.5 w-1.5 rounded-full" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between gap-2 lg:justify-end">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-85 lg:hidden"
            >
              <div className="h-9 w-9 overflow-hidden rounded-xl">
                <img src={logoIcon} alt={brandName} className="h-full w-full" />
              </div>
              <span className="text-nex-text text-xl font-bold whitespace-nowrap">{brandName}</span>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-btn hover:bg-nex-hover text-nex-muted hover:text-nex-text relative flex h-9 w-9 items-center justify-center transition-colors active:scale-95"
                title={isDark ? t('common.light') : t('common.dark')}
                aria-label={t('settings.theme.toggle')}
              >
                <Sun
                  className={`h-5 w-5 text-amber-400 transition-all duration-300 ${
                    isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
                  }`}
                />
                <Moon
                  className={`absolute h-5 w-5 transition-all duration-300 ${
                    isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                  }`}
                />
              </button>
            </div>
          </div>

          <h1 className="text-nex-text mb-1 text-2xl font-bold">
            {t('auth.login.title')}
          </h1>
          <p className="text-nex-muted mb-8">
            {t('auth.login.subtitle')}
          </p>

          {cooldownSec > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>
                {t('auth.login.cooldownWarning', { sec: formatNumber(cooldownSec) })}
              </span>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={googlePending || cooldownSec > 0}
            className="rounded-btn border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover mb-6 flex w-full items-center justify-center gap-3 border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60"
            id="google-login-btn"
          >
            {googlePending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {googlePending ? t('auth.login.redirecting') : t('auth.login.google')}
          </button>

          <div className="mb-6 flex items-center gap-3">
            <div className="bg-nex-border h-px flex-1" />
            <span
              className={`text-nex-muted text-xs ${!isBangla ? 'tracking-wider uppercase' : ''}`}
            >
              {t('auth.login.orEmail')}
            </span>
            <div className="bg-nex-border h-px flex-1" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-nex-text mb-1.5 block text-sm font-medium">
                {t('auth.login.email')}
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
                  id="login-email"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-nex-text block text-sm font-medium">
                  {t('auth.login.password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-nex-primary hover:text-nex-primary-dark text-xs font-medium transition-colors"
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="text-nex-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="nex-input pr-10 pl-10"
                  placeholder="••••••••"
                  required
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                  className="text-nex-muted hover:text-nex-text absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || cooldownSec > 0}
              className="nex-btn-primary w-full py-3 disabled:opacity-50"
              id="login-submit"
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {t('auth.login.submit')} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-nex-muted mt-6 text-center text-sm">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="text-nex-primary font-medium hover:underline">
              {t('auth.login.createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
