import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { ArrowRight, Home, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { createMessSchema, validateForm } from '../../lib/validation/schemas'
import { sanitizeAppError } from '../../lib/errorHandler'

export default function CreateMessPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createMess } = useMessStore()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    // 1. Strict Schema Validation
    const validation = validateForm(createMessSchema, {
      name,
      location: location.trim() || undefined,
    })

    if (!validation.success) {
      toast.error(validation.error)
      return
    }

    setLoading(true)
    try {
      const mess = await createMess(validation.data.name, user.id, validation.data.location)
      if (mess) {
        toast.success(`"${mess.name}" created! Code: ${mess.unique_code}`)
        navigate('/dashboard')
      } else {
        toast.error('Failed to create mess')
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to create mess'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="nex-card p-8">
        <div className="rounded-card bg-nex-primary-light mx-auto mb-6 flex h-14 w-14 items-center justify-center">
          <Home className="text-nex-primary h-7 w-7" />
        </div>
        <h1 className="text-nex-text mb-1 text-center text-2xl font-bold">{t('mess.create.title')}</h1>
        <p className="text-nex-muted mb-8 text-center">{t('mess.create.subtitle')}</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-nex-text mb-1.5 block text-sm font-medium">{t('mess.create.nameLabel')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="nex-input"
              placeholder={t('mess.create.namePlaceholder')}
              required
              maxLength={60}
              id="mess-name-input"
            />
          </div>
          <div>
            <label className="text-nex-text mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="text-nex-muted h-3.5 w-3.5" />
              {t('mess.create.locationLabel')}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="nex-input"
              placeholder={t('mess.create.locationPlaceholder')}
              maxLength={120}
              id="mess-location-input"
            />
            <p className="text-nex-muted mt-1 text-xs">{t('mess.create.locationHint')}</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="nex-btn-primary w-full py-3 disabled:opacity-50"
            id="create-mess-btn"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {t('mess.create.submit')} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
