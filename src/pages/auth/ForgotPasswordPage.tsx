import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Mail, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'

const COOLDOWN = 60

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const isExpired = searchParams.get('expired') === '1'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const sendReset = async (emailToSend: string) => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(emailToSend, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return false
    }
    return true
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
      {/* Left: Branding */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#3A5643] via-[#4A6D56] to-[#5F886E] p-12 text-white lg:flex">
        <div className="max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur">
              <img src={logoIcon} alt="NexMess" className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">NexMess</h1>
          </div>
          <h2 className="mb-4 text-4xl leading-tight font-bold">Reset your password</h2>
          <p className="text-lg leading-relaxed text-[#EDF2EE]">
            Don't worry, we'll help you get back into your account safely.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              <img src={logoIcon} alt="NexMess" className="h-full w-full" />
            </div>
            <h1 className="text-nex-text text-2xl font-bold">NexMess</h1>
          </div>

          <Link
            to="/login"
            className="text-nex-muted hover:text-nex-primary mb-6 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          <h2 className="text-nex-text mb-1 text-2xl font-bold">Forgot password?</h2>

          {/* Expired link banner */}
          {isExpired && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Your reset link has expired.
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  Links are only valid for 1 hour. Enter your email below to get a new one.
                </p>
              </div>
            </div>
          )}

          {sent ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
                <p className="text-sm text-green-800 dark:text-green-300">
                  ✅ If an account exists for <b>{email}</b>, we've sent a password reset link.
                  Please check your inbox and spam folder.
                </p>
              </div>

              <div className="nex-card bg-nex-elevated p-4">
                <p className="text-nex-muted mb-3 text-sm">Didn't receive it?</p>
                <button
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="nex-btn-secondary w-full justify-center gap-2 disabled:opacity-50"
                  id="resend-reset-btn"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend reset email'}
                </button>
              </div>

              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-nex-muted hover:text-nex-primary w-full text-center text-sm transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <p className="text-nex-muted mb-8">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-nex-text mb-1.5 block text-sm font-medium">
                    Email address
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
                  disabled={loading || !email}
                  className="nex-btn-primary w-full py-3 disabled:opacity-50"
                  id="forgot-password-submit"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      Send Reset Link <ArrowRight className="h-4 w-4" />
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
