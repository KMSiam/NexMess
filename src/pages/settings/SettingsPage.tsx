import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Settings, UserCheck, UserX, Copy, CheckCircle2, Trash2, AlertTriangle, LogOut, Bell, BellOff } from 'lucide-react'
import { getInitials } from '../../lib/utils'
import { isPushSupported, isSubscribed, subscribeToPush, unsubscribeFromPush } from '../../lib/push'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, user, updateProfile } = useAuthStore()
  const { currentMess, members, fetchMembers, fetchUserMesses } = useMessStore()
  const [username, setUsername] = useState(profile?.username || '')
  const [saving, setSaving] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const pushSupported = isPushSupported()

  useEffect(() => {
    isSubscribed().then(setPushEnabled)
  }, [])
  const [copied, setCopied] = useState(false)
  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')

  const pendingMembers = members.filter(m => m.status === 'pending')
  const approvedMembers = members.filter(m => m.status === 'approved')

  useEffect(() => {
    if (currentMess?.id) {
      fetchMembers(currentMess.id)

      // Real-time listener for members (approvals/requests)
      const channel = supabase
        .channel(`members-${currentMess.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mess_members', filter: `mess_id=eq.${currentMess.id}` },
          () => fetchMembers(currentMess.id)
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentMess?.id, fetchMembers])

  const handlePushToggle = async () => {
    if (!user?.id) return
    setPushLoading(true)
    if (pushEnabled) {
      const ok = await unsubscribeFromPush(user.id)
      if (ok) { setPushEnabled(false); toast.success('Push notifications disabled') }
      else toast.error('Failed to disable push notifications')
    } else {
      const ok = await subscribeToPush(user.id)
      if (ok) { setPushEnabled(true); toast.success('Push notifications enabled!') }
      else if (Notification.permission === 'denied') toast.error('Notifications blocked. Enable them in your browser settings.')
      else toast.error('Failed to enable push notifications')
    }
    setPushLoading(false)
  }

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
    if (!currentMess?.id || !window.confirm('Remove this member? Their info will be kept for the monthly statement.')) return
    await supabase.from('mess_members')
      .update({ status: 'left' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
    toast.success('Member removed but past data saved')
    fetchMembers(currentMess.id)
  }

  const handleMakeManager = async (userId: string) => {
    if (!currentMess?.id) return
    const managersCount = approvedMembers.filter(m => m.role === 'manager').length
    if (managersCount >= 3) {
      toast.error('Maximum 3 managers allowed per mess')
      return
    }
    if (!confirm('Promote this member to manager? They will have full access.')) return
    
    await supabase.from('mess_members')
      .update({ role: 'manager' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
    toast.success('Member promoted to manager')
    fetchMembers(currentMess.id)
  }

  const handleDemoteManager = async (userId: string) => {
    if (!currentMess?.id) return
    const managersCount = approvedMembers.filter(m => m.role === 'manager').length
    if (managersCount <= 1) {
      toast.error('Cannot demote the last manager')
      return
    }
    const isSelf = userId === user?.id
    if (isSelf && !confirm('Demote YOURSELF? You will lose manager access immediately.')) return
    if (!isSelf && !confirm('Demote this manager to a regular member?')) return

    await supabase.from('mess_members')
      .update({ role: 'member' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
    toast.success('Manager demoted to member')
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

  const handleDeleteMess = async () => {
    if (!currentMess?.id || !user?.id) return
    const confirmName = window.prompt(`DANGER: Type "${currentMess.name}" to delete the mess permanently.`)
    if (confirmName !== currentMess.name) {
      if (confirmName !== null) toast.error('Name did not match. Deletion cancelled.')
      return
    }

    const { error } = await supabase.from('messes').delete().eq('id', currentMess.id)
    if (error) {
      toast.error('Failed to delete mess')
    } else {
      toast.success('Mess permanently deleted.')
      await fetchUserMesses(user.id)
      navigate('/')
    }
  }

  const handleLeaveMess = async () => {
    if (!currentMess || !user) return
    const managersCount = approvedMembers.filter(m => m.role === 'manager').length
    if (isManager && managersCount === 1) {
      toast.error('You are the only manager. Make someone else manager or delete the mess to leave.')
      return
    }

    if (!window.confirm('Are you sure you want to leave this mess? You will lose access immediately, but your past data will be kept for the monthly statement.')) return

    const { error } = await supabase.from('mess_members')
      .update({ status: 'left' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to leave mess: ' + error.message)
    } else {
      toast.success('You have left the mess.')
      await fetchUserMesses(user.id)
      navigate('/')
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
              <p className="text-xs text-nex-muted mb-3">{user?.email}</p>
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

      {/* Push Notifications */}
      {pushSupported && (
        <div className="nex-card p-6">
          <h3 className="text-lg font-semibold text-nex-text mb-4">Push Notifications</h3>
          <div className="flex items-center justify-between p-4 bg-nex-elevated rounded-xl">
            <div className="flex items-center gap-3">
              {pushEnabled
                ? <Bell className="w-5 h-5 text-nex-primary" />
                : <BellOff className="w-5 h-5 text-nex-muted" />}
              <div>
                <p className="text-sm font-medium text-nex-text">Device Notifications</p>
                <p className="text-xs text-nex-muted mt-0.5">
                  {pushEnabled ? 'Receive notices and updates even when the app is closed.' : 'Enable to get alerts when the app is in the background.'}
                </p>
              </div>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 disabled:opacity-50 ${pushEnabled ? 'nex-toggle-on' : 'nex-toggle-off'}`}
              id="push-toggle"
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Mess Info */}
      {currentMess && (
        <div className="nex-card p-6">
          <h3 className="text-lg font-semibold text-nex-text mb-4">Mess Details</h3>
          <div className="flex items-center justify-between p-4 bg-nex-elevated rounded-xl">
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
                <div key={member.user_id} className="flex items-center justify-between p-3 bg-nex-elevated rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-nex-border flex items-center justify-center text-sm font-semibold text-nex-muted">
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
              <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-nex-hover transition-colors">
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
                {isManager && (
                  <div className="flex items-center gap-3">
                    {member.role === 'member' ? (
                      <button onClick={() => handleMakeManager(member.user_id)} className="text-xs font-medium text-nex-primary hover:text-blue-700 transition-colors bg-nex-primary-light px-2 py-1 rounded">
                        Make Manager
                      </button>
                    ) : (
                      <button onClick={() => handleDemoteManager(member.user_id)} className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 px-2 py-1 rounded">
                        Remove Manager
                      </button>
                    )}
                    {member.role !== 'manager' && (
                      <button onClick={() => handleRemove(member.user_id)} className="text-xs text-nex-muted hover:text-nex-danger transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Leave Mess Zone */}
      {currentMess && (
        <div className="nex-card p-6 border border-amber-500/20 mt-6">
          <h3 className="text-lg font-semibold text-amber-500 mb-4 flex items-center gap-2">
            <LogOut className="w-5 h-5" /> Leave Mess
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-500/10 rounded-xl">
            <div>
              <p className="text-sm font-medium text-amber-500">Leave your current mess</p>
              <p className="text-xs text-nex-muted mt-1 max-w-sm">
                This will remove your access to the mess. You must create or join another mess afterwards.
              </p>
            </div>
            <button onClick={handleLeaveMess} className="nex-btn-secondary text-sm shrink-0 flex items-center justify-center gap-2 !text-amber-500 !border-amber-500/30 hover:!bg-amber-500/10">
              <LogOut className="w-4 h-4" /> Leave Mess
            </button>
          </div>
        </div>
      )}

      {/* Delete Mess Zone */}
      {isManager && currentMess && (
        <div className="nex-card p-6 border border-red-500/20">
          <h3 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-500/10 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-500">Delete this mess</p>
              <p className="text-xs text-nex-muted mt-1 max-w-sm">
                Permanently delete this mess and all its data. This action is irreversible and affects all members.
              </p>
            </div>
            <button onClick={handleDeleteMess} className="nex-btn-danger text-sm shrink-0 flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete Mess
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
