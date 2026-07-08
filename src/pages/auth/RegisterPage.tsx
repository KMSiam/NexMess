import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!agreeTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      toast.error('Password must include at least one letter and one number')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Check your email for a verification link!')
      navigate('/verify-email', { state: { email } })
    }
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    if (!agreeTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy')
      return
    }
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) {
      toast.error(error.message)
      setGoogleLoading(false)
    }
    // Note: on success, browser redirects — no need to reset state
  }

  return (
    <div className="bg-nex-bg flex min-h-screen">
      {/* Left: Branding */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#3A5643] via-[#4A6D56] to-[#5F886E] p-12 text-white lg:flex">
        <div className="max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-85">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur">
              <img src={logoIcon} alt="NexMess" className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">NexMess</h1>
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

      {/* Right: Register Form */}
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

          <h2 className="text-nex-text mb-1 text-2xl font-bold">Create your account</h2>
          <p className="text-nex-muted mb-8">Get started with NexMess for free</p>

          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading}
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

            {/* Terms & Privacy Policy Checkbox */}
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
              disabled={loading}
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
