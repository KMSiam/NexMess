import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password reset link sent!')
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-nex-bg flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
              <img src={logoIcon} alt="NexMess" className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">NexMess</h1>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Reset your password
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            Don't worry, we'll help you get back into your account safely.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src={logoIcon} alt="NexMess" className="w-full h-full" />
            </div>
            <h1 className="text-2xl font-bold text-nex-text">NexMess</h1>
          </div>

          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-nex-muted hover:text-nex-primary mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>

          <h2 className="text-2xl font-bold text-nex-text mb-1">Forgot password?</h2>
          
          {sent ? (
            <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-100">
              <p className="text-green-800 text-sm">
                If an account exists for <b>{email}</b>, we have sent a password reset link. Please check your inbox.
              </p>
            </div>
          ) : (
            <>
              <p className="text-nex-muted mb-8">Enter your email and we'll send you a reset link.</p>
              
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-nex-text mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nex-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="nex-input pl-10"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="nex-btn-primary w-full py-3 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
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
