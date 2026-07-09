import { useState, useTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [googlePending, startGoogleTransition] = useTransition()

  const handleEmailLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        toast.error(error.message)
      } else {
        if (data?.session) {
          useAuthStore.getState().setSession(data.session)
          await useAuthStore.getState().fetchProfile()
        }
        toast.success('Welcome back!')
        navigate('/dashboard')
      }
    })
  }

  const handleGoogleLogin = () => {
    startGoogleTransition(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) {
        toast.error(error.message)
      }
    })
  }

  return (
    <div className="bg-nex-bg flex min-h-screen">
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#3A5643] via-[#4A6D56] to-[#5F886E] p-12 text-white lg:flex">
        <div className="max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-85">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur">
              <img src={logoIcon} alt="NexMess" className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">NexMess</h1>
          </Link>
          <h2 className="mb-4 text-4xl leading-tight font-bold">
            Manage your mess,
            <br />
            the smart way.
          </h2>
          <p className="text-lg leading-relaxed text-[#EDF2EE]">
            Track meals, split expenses, coordinate bazaar duty — all in one beautiful app built for
            shared living.
          </p>
          <div className="mt-10 flex gap-6">
            {['Real-time Meals', 'Auto Billing', 'Group Chat'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#EDF2EE]">
                <div className="bg-nex-success h-1.5 w-1.5 rounded-full" />
                {f}
              </div>
            ))}
          </div>
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
            <h1 className="text-nex-text text-2xl font-bold">NexMess</h1>
          </Link>

          <h2 className="text-nex-text mb-1 text-2xl font-bold">Welcome back</h2>
          <p className="text-nex-muted mb-8">Sign in to continue to your dashboard</p>

          <button
            onClick={handleGoogleLogin}
            disabled={googlePending}
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
            {googlePending ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <div className="mb-6 flex items-center gap-3">
            <div className="bg-nex-border h-px flex-1" />
            <span className="text-nex-muted text-xs tracking-wider uppercase">
              or sign in with email
            </span>
            <div className="bg-nex-border h-px flex-1" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
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
                  id="login-email"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-nex-text block text-sm font-medium">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-nex-primary hover:text-nex-primary-dark text-xs font-medium transition-colors"
                >
                  Forgot password?
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
                  className="text-nex-muted hover:text-nex-text absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
            disabled={isPending}
            className="nex-btn-primary w-full py-3 disabled:opacity-50"
            id="login-submit"
          >
            {isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
            </button>
          </form>

          <p className="text-nex-muted mt-6 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-nex-primary font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
