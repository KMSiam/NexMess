import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-nex-bg flex items-center justify-center p-6">
      <div className="nex-card p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-nex-primary-light mx-auto flex items-center justify-center mb-6">
          <MailCheck className="w-8 h-8 text-nex-primary" />
        </div>
        <h1 className="text-2xl font-bold text-nex-text mb-2">Check your email</h1>
        <p className="text-nex-muted mb-6 leading-relaxed">
          We've sent a verification link to your email address. Click the link to verify your account and start using NexMess.
        </p>
        <div className="nex-card bg-slate-50 p-4 mb-6">
          <p className="text-sm text-nex-muted">
            📧 Didn't receive the email? Check your spam folder or{' '}
            <button className="text-nex-primary font-medium hover:underline">resend it</button>.
          </p>
        </div>
        <Link to="/login" className="nex-btn-secondary w-full justify-center" id="back-to-login">
          Back to Login
        </Link>
      </div>
    </div>
  )
}
