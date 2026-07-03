import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center p-6">
      <div className="nex-card w-full max-w-md p-8 text-center">
        <div className="bg-nex-primary-light mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <MailCheck className="text-nex-primary h-8 w-8" />
        </div>
        <h1 className="text-nex-text mb-2 text-2xl font-bold">Check your email</h1>
        <p className="text-nex-muted mb-6 leading-relaxed">
          We've sent a verification link to your email address. Click the link to verify your
          account and start using NexMess.
        </p>
        <div className="nex-card bg-nex-elevated mb-6 p-4">
          <p className="text-nex-muted text-sm">
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
