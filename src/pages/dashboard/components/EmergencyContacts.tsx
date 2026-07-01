import { useState } from 'react'
import { ShieldAlert, PhoneCall, Plus, Trash2 } from 'lucide-react'
import type { EmergencyContact as EC } from '../../../hooks/useDashboardData'

interface EmergencyContactsProps {
  contacts: EC[]
  isManager: boolean
  onAdd: (name: string, phone: string) => Promise<void>
  onDelete: (id: string) => void
}

export default function EmergencyContacts({ contacts, isManager, onAdd, onDelete }: EmergencyContactsProps) {
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
    <div className="nex-card p-5 border-t-4 border-red-400">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">Emergency Contacts</h4>
        </div>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="nex-btn-secondary text-xs py-1 px-2">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {showForm && isManager && (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-nex-danger-light rounded-xl border border-nex-danger/10">
          <input type="text" placeholder="Name (e.g., Manager, House Owner)" value={name} onChange={e => setName(e.target.value)} required className="nex-input flex-1 text-sm py-1.5" />
          <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required className="nex-input flex-1 text-sm py-1.5" />
          <button type="submit" className="nex-btn-primary py-1.5 px-4 text-sm whitespace-nowrap">Save</button>
        </form>
      )}

      {contacts.length === 0 ? (
        <p className="text-xs text-nex-muted">No emergency contacts added yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {contacts.map(ec => (
            <div key={ec.id} className="flex items-center justify-between p-3 rounded-xl border border-nex-border bg-nex-elevated hover:bg-nex-hover transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-nex-text truncate">{ec.name}</p>
                  <a href={`tel:${ec.phone}`} className="text-xs font-semibold text-nex-primary hover:underline">{ec.phone}</a>
                </div>
              </div>
              {isManager && (
                <button onClick={() => onDelete(ec.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
