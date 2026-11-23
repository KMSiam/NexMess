import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Home } from 'lucide-react'
import { useSEO } from '../../hooks/useSEO'

export default function NotFoundPage() {
  const { t } = useTranslation()
  useSEO({
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist on NexMess.',
    robots: 'noindex, nofollow',
  })

  return (
    <div className="bg-nex-bg animate-fade-in flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="bg-nex-danger-light mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertCircle className="text-nex-danger h-8 w-8" />
      </div>
      <h1 className="text-nex-text mb-2 text-4xl font-extrabold tracking-tight">{t('notFound.title')}</h1>
      <h2 className="text-nex-text mb-2 text-xl font-bold">{t('notFound.heading')}</h2>
      <p className="text-nex-muted mb-8 max-w-sm text-sm leading-relaxed">
        {t('notFound.desc')}
      </p>
      <Link to="/dashboard" className="nex-btn-primary flex items-center gap-2">
        <Home className="h-4 w-4" />
        {t('notFound.backHome')}
      </Link>
    </div>
  )
}
