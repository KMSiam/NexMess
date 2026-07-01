import { Link } from 'react-router-dom'
import { AlertCircle, Home } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Page Not Found')

  return (
    <div className="min-h-screen bg-nex-bg flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-nex-danger-light flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-nex-danger" />
      </div>
      <h1 className="text-4xl font-extrabold text-nex-text mb-2 tracking-tight">404</h1>
      <h2 className="text-xl font-bold text-nex-text mb-2">Lost in the Mess?</h2>
      <p className="text-sm text-nex-muted max-w-sm mb-8 leading-relaxed">
        The page you are looking for doesn't exist, has been moved, or you don't have permissions to view it.
      </p>
      <Link
        to="/dashboard"
        className="nex-btn-primary flex items-center gap-2"
      >
        <Home className="w-4 h-4" />
        Go to Dashboard
      </Link>
    </div>
  )
}
