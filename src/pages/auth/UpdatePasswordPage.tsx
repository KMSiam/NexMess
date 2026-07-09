import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    // Check if we already have a session (in case auto-exchange happened quickly)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
        setInvalid(false)
      }
    })

    // Set a timeout — if no session is established within 5s, the link is expired
    const timeout = setTimeout(() => {
      setReady((currentReady) => {
        if (!currentReady) setInvalid(true)
        return currentReady
      })
    }, 5000)

    // Listen for PASSWORD_RECOVERY or SIGNED_IN events signifying the recovery link token was successfully verified.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        clearTimeout(timeout)
        setReady(true)
        setInvalid(false)
      }
      // Note: We do not automatically redirect here, as the user must submit the form first.
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

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
    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Password updated! Redirecting...')
      setTimeout(() => navigate('/dashboard', { replace: true }), 1000)
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
            <h1 className="text-3xl font-bold">NexMess</h1>
          </div>
          <h2 className="mb-4 text-4xl leading-tight font-bold">Secure your account</h2>
          <p className="text-lg leading-relaxed text-[#EDF2EE]">
            Please enter your new password below.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              <img src={logoIcon} alt="NexMess" className="h-full w-full" />
            </div>
            <h1 className="text-nex-text text-2xl font-bold">NexMess</h1>
          </div>

          <h2 className="text-nex-text mb-1 text-2xl font-bold">Set new password</h2>
          <p className="text-nex-muted mb-8">Almost done! Enter your new secure password.</p>

          {invalid ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    This reset link is invalid or has expired.
                  </p>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Password reset links expire after 1 hour. Please request a new one.
                  </p>
                </div>
              </div>
              <Link
                to="/forgot-password"
                className="nex-btn-primary flex w-full items-center justify-center gap-2 py-3"
              >
                Request New Reset Link <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
              <p className="text-nex-muted text-sm">Verifying your reset link...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-nex-text mb-1.5 block text-sm font-medium">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="text-nex-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="nex-input pr-10 pl-10"
                    placeholder="Min. 8 chars, letters + numbers"
                    required
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
                  Confirm New Password
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
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="nex-btn-primary mt-6 w-full py-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Update Password <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
