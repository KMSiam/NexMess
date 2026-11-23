import { useState } from 'react'
import { ShieldAlert, PhoneCall, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EmergencyContact as EC } from '../../../hooks/useDashboardData'

interface EmergencyContactsProps {
  contacts: EC[]
  isManager: boolean
  onAdd: (name: string, phone: string) => Promise<void>
  onDelete: (id: string) => void
}

export default function EmergencyContacts({
  contacts,
  isManager,
  onAdd,
  onDelete,
}: EmergencyContactsProps) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    await onAdd(name.trim(), phone.trim())
    setShowForm(false)
    setName('')
    setPhone('')
  }

  return (
    <div className="nex-card border-t-4 border-red-400 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <h4 className="text-nex-text text-sm font-semibold tracking-wider uppercase">
            {t('dashboard.emergencyContacts')}
          </h4>
        </div>
        {isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="nex-btn-secondary px-2 py-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> {t('common.add')}
          </button>
        )}
      </div>

      {showForm && isManager && (
        <form
          onSubmit={handleSubmit}
          className="bg-nex-danger-light border-nex-danger/10 mb-4 flex flex-col gap-2 rounded-xl border p-3 sm:flex-row"
        >
          <input
            type="text"
            placeholder={t('dashboard.contactName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="nex-input flex-1 py-1.5 text-sm"
          />
          <input
            type="tel"
            placeholder={t('dashboard.contactPhone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="nex-input flex-1 py-1.5 text-sm"
          />
          <button type="submit" className="nex-btn-primary px-4 py-1.5 text-sm whitespace-nowrap">
            {t('common.save')}
          </button>
        </form>
      )}

      {contacts.length === 0 ? (
        <p className="text-nex-muted text-xs">{t('dashboard.noEmergencyContacts')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {contacts.map((ec) => (
            <div
              key={ec.id}
              className="border-nex-border bg-nex-elevated hover:bg-nex-hover flex items-center justify-between rounded-xl border p-3 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-nex-text truncate text-sm font-medium">{ec.name}</p>
                  <a
                    href={`tel:${ec.phone}`}
                    className="text-nex-primary text-xs font-semibold hover:underline"
                  >
                    {ec.phone}
                  </a>
                </div>
              </div>
              {isManager && (
                <button
                  onClick={() => onDelete(ec.id)}
                  className="shrink-0 p-1.5 text-slate-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
