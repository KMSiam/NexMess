import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Settings, UserCheck, UserX, Shield, Copy, CheckCircle2, Camera } from 'lucide-react'
import { getInitials } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { profile, user, updateProfile } = useAuthStore()
  const { currentMess, members, fetchMembers } = useMessStore()
  const [username, setUsername] = useState(profile?.username || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')

  const pendingMembers = members.filter(m => m.status === 'pending')
  const approvedMembers = members.filter(m => m.status === 'approved')

  useEffect(() => {
    if (currentMess?.id) fetchMembers(currentMess.id)
  }, [currentMess?.id])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await updateProfile({ username: username.trim() })
    toast.success('Profile updated!')
    setSaving(false)
  }

  const handleApprove = async (userId: string) => {
    if (!currentMess?.id) return
    await supabase.from('mess_members')
      .update({ status: 'approved' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
    toast.success('Member approved!')
    fetchMembers(currentMess.id)
  }

  const handleReject = async (userId: string) => {
    if (!currentMess?.id) return
    await supabase.from('mess_members')
      .delete()
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
    toast.success('Request rejected')
    fetchMembers(currentMess.id)
  }

  const handleRemove = async (userId: string) => {
    if (!currentMess?.id || !confirm('Remove this member?')) return
    await supabase.from('mess_members')
      .delete()
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
    toast.success('Member removed')
    fetchMembers(currentMess.id)
  }

  const copyCode = () => {
    if (currentMess?.unique_code) {
      navigator.clipboard.writeText(currentMess.unique_code)
      setCopied(true)
      toast.success('Code copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-nex-primary" />
        <h1 className="text-2xl font-bold text-nex-text">Settings</h1>
      </div>

      {/* Profile */}
      <div className="nex-card p-6">
        <h3 className="text-lg font-semibold text-nex-text mb-4">Profile</h3>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : getInitials(profile?.username || 'U')}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-nex-text mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="nex-input" id="settings-username" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="nex-btn-primary disabled:opacity-50" id="save-profile">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Mess Info */}
      {currentMess && (
        <div className="nex-card p-6">
          <h3 className="text-lg font-semibold text-nex-text mb-4">Mess Details</h3>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-nex-text">{currentMess.name}</p>
              <p className="text-xs text-nex-muted font-mono mt-0.5">{currentMess.unique_code}</p>
            </div>
            <button onClick={copyCode} className="nex-btn-secondary text-xs" id="copy-code">
              {copied ? <CheckCircle2 className="w-4 h-4 text-nex-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
          </div>
        </div>
      )}

      {/* Pending Requests (Manager) */}
      {isManager && pendingMembers.length > 0 && (
        <div className="nex-card p-6">
          <h3 className="text-lg font-semibold text-nex-text mb-4 flex items-center gap-2">
            Pending Requests
            <span className="nex-badge-danger">{pendingMembers.length}</span>
          </h3>
          <div className="space-y-3">
            {pendingMembers.map(member => {
              const p = member.profiles as any
              return (
                <div key={member.user_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                      {getInitials(p?.username || '?')}
                    </div>
                    <p className="text-sm font-medium text-nex-text">{p?.username || 'Unknown'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(member.user_id)} className="nex-btn-primary text-xs py-1.5 px-3">
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleReject(member.user_id)} className="nex-btn-danger text-xs py-1.5 px-3">
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="nex-card p-6">
        <h3 className="text-lg font-semibold text-nex-text mb-4">Members ({approvedMembers.length})</h3>
        <div className="space-y-2">
          {approvedMembers.map(member => {
            const p = member.profiles as any
            return (
              <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : getInitials(p?.username || '?')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-nex-text flex items-center gap-1.5">
                      {p?.username || 'Unknown'}
                      {p?.is_verified && <span className="nex-verified"><CheckCircle2 className="w-3 h-3" /></span>}
                    </p>
                    <p className="text-xs text-nex-muted capitalize">{member.role}</p>
                  </div>
                </div>
                {isManager && member.role !== 'manager' && (
                  <button onClick={() => handleRemove(member.user_id)} className="text-xs text-nex-muted hover:text-nex-danger transition-colors">
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
