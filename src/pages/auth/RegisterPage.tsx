import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'
import { useSEO } from '../../hooks/useSEO'
import { registerSchema, validateForm } from '../../lib/validation/schemas'
import { checkRateLimit, recordRateLimitAttempt } from '../../lib/rateLimiter'
import { sanitizeAppError } from '../../lib/errorHandler'

export default function RegisterPage() {
  useSEO({
    title: 'Get Started | Create Your Mess',
    description: 'Register for NexMess and create or join a mess. Start tracking meals, managing group expenses, and automating roommate duties today.',
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
      toast.error(validation.error)
      return
    }

    // 2. Client-Side Rate Limiter Check (Exponential Backoff)
    const rateLimitKey = `register:${email.toLowerCase().trim()}`
    const rlStatus = checkRateLimit(rateLimitKey)
    if (!rlStatus.allowed) {
      setCooldownSec(rlStatus.retryAfterSec)
      toast.error(rlStatus.message || 'Too many attempts. Please wait.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })

      if (error) {
        recordRateLimitAttempt(rateLimitKey, false)
        toast.error(sanitizeAppError(error))
        const newRl = checkRateLimit(rateLimitKey)
        if (!newRl.allowed) setCooldownSec(newRl.retryAfterSec)
      } else if (data?.user?.identities && data.user.identities.length === 0) {
        recordRateLimitAttempt(rateLimitKey, false)
        toast.error('This email is already registered. Please sign in.')
      } else {
        recordRateLimitAttempt(rateLimitKey, true)
        setCooldownSec(0)
        toast.success('Check your email for a verification link!')
        navigate('/verify-email', { state: { email } })
      }
    } catch (err: unknown) {
      recordRateLimitAttempt(rateLimitKey, false)
      toast.error(sanitizeAppError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!agreeTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy')
      return
    }
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) {
        toast.error(sanitizeAppError(error))
        setGoogleLoading(false)
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err))
      setGoogleLoading(false)
    }
  }

  return (
    <div className="bg-nex-bg flex min-h-screen">
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#3A5643] via-[#4A6D56] to-[#5F886E] p-12 text-white lg:flex">
        <div className="max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-85">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur">
              <img src={logoIcon} alt="NexMess" className="h-10 w-10" />
            </div>
            <span className="text-3xl font-bold">NexMess</span>
          </Link>
          <h2 className="mb-4 text-4xl leading-tight font-bold">
            Join your mess
            <br />
            in seconds.
          </h2>
          <p className="text-lg leading-relaxed text-[#EDF2EE]">
            Create an account, set up your profile, and start managing your mess life effortlessly.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-85 lg:hidden"
          >
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              <img src={logoIcon} alt="NexMess" className="h-full w-full" />
            </div>
            <span className="text-nex-text text-2xl font-bold">NexMess</span>
          </Link>

          <h1 className="text-nex-text mb-1 text-2xl font-bold">Create your account</h1>
          <p className="text-nex-muted mb-8">Get started with NexMess for free</p>

          {cooldownSec > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>Too many registration attempts. Please wait {cooldownSec}s before retrying.</span>
            </div>
          )}

          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading || cooldownSec > 0}
            className="rounded-btn border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover mb-6 flex w-full items-center justify-center gap-3 border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60"
            id="google-register-btn"
          >
            {googleLoading ? (
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
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <div className="mb-6 flex items-center gap-3">
            <div className="bg-nex-border h-px flex-1" />
            <span className="text-nex-muted text-xs tracking-wider uppercase">
              or register with email
            </span>
            <div className="bg-nex-border h-px flex-1" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-nex-text mb-1.5 block text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="text-nex-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="nex-input pl-10"
                  placeholder="you@example.com"
                  required
                  id="register-email"
                />
              </div>
            </div>

            <div>
              <label className="text-nex-text mb-1.5 block text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="text-nex-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="nex-input pr-10 pl-10"
                  placeholder="Min. 8 chars, letters + numbers"
                  required
                  id="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-nex-muted hover:text-nex-text absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-nex-text mb-1.5 block text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="text-nex-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="nex-input pl-10"
                  placeholder="••••••••"
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
                className="border-nex-border bg-nex-surface text-nex-primary accent-nex-primary focus:ring-nex-primary mt-0.5 h-4 w-4 cursor-pointer rounded"
                required
              />
              <label
                htmlFor="agree-terms"
                className="text-nex-muted cursor-pointer text-xs leading-normal select-none"
              >
                I agree to the{' '}
                <Link
                  to="/terms-of-service"
                  className="text-nex-primary font-semibold hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy-policy"
                  className="text-nex-primary font-semibold hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || cooldownSec > 0}
              className="nex-btn-primary w-full py-3 disabled:opacity-50"
              id="register-submit"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-nex-muted mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-nex-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
