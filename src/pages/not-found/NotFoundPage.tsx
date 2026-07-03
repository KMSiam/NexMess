import { Link } from 'react-router-dom'
import { AlertCircle, Home } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Page Not Found')

  return (
    <div className="bg-nex-bg animate-fade-in flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="bg-nex-danger-light mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertCircle className="text-nex-danger h-8 w-8" />
      </div>
      <h1 className="text-nex-text mb-2 text-4xl font-extrabold tracking-tight">404</h1>
      <h2 className="text-nex-text mb-2 text-xl font-bold">Lost in the Mess?</h2>
      <p className="text-nex-muted mb-8 max-w-sm text-sm leading-relaxed">
        The page you are looking for doesn't exist, has been moved, or you don't have permissions to
        view it.
      </p>
      <Link to="/dashboard" className="nex-btn-primary flex items-center gap-2">
        <Home className="h-4 w-4" />
        Go to Dashboard
      </Link>
    </div>
  )
}
