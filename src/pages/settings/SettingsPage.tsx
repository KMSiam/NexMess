import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Settings, User, Users, Home, Bell, AlertTriangle, MessageCircle } from 'lucide-react'
import { isSubscribed, subscribeToPush, unsubscribeFromPush } from '../../lib/push'
import toast from 'react-hot-toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import SupportModal from '../../components/SupportModal'
import pkg from '../../../package.json'

// Custom Hooks
import { usePageTitle } from '../../hooks/usePageTitle'

// Sub-components
import ProfileSection from './components/ProfileSection'
import PushNotificationSection from './components/PushNotificationSection'
import MessDetailsSection from './components/MessDetailsSection'
import MemberManagement from './components/MemberManagement'
import DangerZone from './components/DangerZone'

export default function SettingsPage() {
  usePageTitle('Settings')
  const navigate = useNavigate()
  const { profile, user, updateProfile } = useAuthStore()
  const { currentMess, members, fetchMembers, fetchUserMesses } = useMessStore()

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'profile' | 'members' | 'mess' | 'notifications' | 'danger'>('profile')
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  // Modal Dialogs States
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDeleteAccountOpen, setConfirmDeleteAccountOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [promoteMemberId, setPromoteMemberId] = useState<string | null>(null)
  const [demoteMemberId, setDemoteMemberId] = useState<string | null>(null)

  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')
  const pendingMembers = members.filter(m => m.status === 'pending')
  const approvedMembers = members.filter(m => m.status === 'approved')

  useEffect(() => {
    isSubscribed().then(setPushEnabled)
  }, [])

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
      if (ok) {
        setPushEnabled(false)
        toast.success('Push notifications disabled')
      } else {
        toast.error('Failed to disable push notifications')
      }
    } else {
      const ok = await subscribeToPush(user.id)
      if (ok) {
        setPushEnabled(true)
        toast.success('Push notifications enabled!')
      } else if (Notification.permission === 'denied') {
        toast.error('Notifications blocked. Enable them in your browser settings.')
      } else {
        toast.error('Failed to enable push notifications')
      }
    }
    setPushLoading(false)
  }

  const handleProfileUpdate = async (
    username: string,
    contactNo: string,
    avatarUrl: string | null,
    verificationDocType?: 'nid' | 'birth_certificate' | 'other' | null,
    verificationDocNo?: string | null,
    verificationDocUrl?: string | null,
    emergencyContactNo?: string | null
  ) => {
    await updateProfile({
      username,
      contact_no: contactNo,
      avatar_url: avatarUrl,
      verification_doc_type: verificationDocType,
      verification_doc_no: verificationDocNo,
      verification_doc_url: verificationDocUrl,
      emergency_contact_no: emergencyContactNo,
    })
    toast.success('Profile updated!')
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
    
    if (currentMess.name) {
      await supabase.from('notifications').insert({
        user_id: userId,
        mess_id: currentMess.id,
        type: 'join_rejected',
        title: 'Request rejected',
        body: `Your request to join ${currentMess.name} has been declined.`
      })
    }

    await supabase.from('mess_members')
      .delete()
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
      
    toast.success('Request rejected')
    fetchMembers(currentMess.id)
  }

  const handleConfirmRemoveMember = async () => {
    if (!currentMess?.id || !removeMemberId) return
    await supabase.from('mess_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('mess_id', currentMess.id)
      .eq('user_id', removeMemberId)
    toast.success('Member removed but past data saved')
    setRemoveMemberId(null)
    fetchMembers(currentMess.id)
  }

  const handleConfirmPromoteMember = async () => {
    if (!currentMess?.id || !promoteMemberId) return
    const managersCount = approvedMembers.filter(m => m.role === 'manager').length
    if (managersCount >= 3) {
      toast.error('Maximum 3 managers allowed per mess')
      setPromoteMemberId(null)
      return
    }

    await supabase.from('mess_members')
      .update({ role: 'manager' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', promoteMemberId)
    toast.success('Member promoted to manager')
    setPromoteMemberId(null)
    fetchMembers(currentMess.id)
  }

  const handleConfirmDemoteMember = async () => {
    if (!currentMess?.id || !demoteMemberId) return
    const managersCount = approvedMembers.filter(m => m.role === 'manager').length
    if (managersCount <= 1) {
      toast.error('Cannot demote the last manager')
      setDemoteMemberId(null)
      return
    }

    await supabase.from('mess_members')
      .update({ role: 'member' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', demoteMemberId)

    toast.success('Manager demoted to member')

    // If the user demoted themselves, redirect or reload permissions
    if (demoteMemberId === user?.id) {
      navigate('/dashboard')
    } else {
      fetchMembers(currentMess.id)
    }
    setDemoteMemberId(null)
  }

  const handleConfirmLeaveMess = async () => {
    if (!currentMess || !user) return
    const managersCount = approvedMembers.filter(m => m.role === 'manager').length
    if (isManager && managersCount === 1) {
      toast.error('You are the only manager. Make someone else manager or delete the mess to leave.')
      setConfirmLeaveOpen(false)
      return
    }

    const { error } = await supabase.from('mess_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('mess_id', currentMess.id)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to leave mess: ' + error.message)
    } else {
      toast.success('You have left the mess.')
      setConfirmLeaveOpen(false)
      await fetchUserMesses(user.id)
      navigate('/')
    }
  }

  const handleConfirmDeleteMess = async () => {
    if (!currentMess?.id || !user?.id) return

    const { error } = await supabase.from('messes').delete().eq('id', currentMess.id)
    if (error) {
      toast.error('Failed to delete mess')
    } else {
      toast.success('Mess permanently deleted.')
      setConfirmDeleteOpen(false)
      await fetchUserMesses(user.id)
      navigate('/')
    }
  }

  const handleConfirmDeleteAccount = async () => {
    if (!user?.id) return

    const { error } = await supabase.from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to deactivate account: ' + error.message)
    } else {
      toast.success('Account deactivated. Signing out...')
      setConfirmDeleteAccountOpen(false)
      const { signOut } = useAuthStore.getState()
      await signOut()
      navigate('/')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-nex-primary" />
        <h1 className="text-2xl font-bold text-nex-text">Settings</h1>
      </div>

      {/* Tabs Navigation */}
      <div className="flex w-full max-w-full gap-1.5 p-1 bg-nex-elevated rounded-xl border border-nex-border/80 overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('profile')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
            activeTab === 'members'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members</span>
          {pendingMembers.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-nex-danger text-[9px] font-bold text-white ring-2 ring-nex-bg animate-pulse">
              {pendingMembers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mess')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === 'mess'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Mess Info</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === 'notifications'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('danger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === 'danger'
              ? 'bg-red-500 text-white shadow-md'
              : 'text-nex-muted hover:text-red-500 hover:bg-red-500/10'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-4 min-h-[300px]">
        {activeTab === 'profile' && (
          <ProfileSection
            profile={profile}
            email={user?.email}
            onUpdate={handleProfileUpdate}
          />
        )}

        {activeTab === 'members' && (
          <MemberManagement
            pendingMembers={pendingMembers}
            approvedMembers={approvedMembers}
            isManager={isManager}
            onApprove={handleApprove}
            onReject={handleReject}
            onRemove={setRemoveMemberId}
            onMakeManager={setPromoteMemberId}
            onDemoteManager={setDemoteMemberId}
          />
        )}

        {activeTab === 'mess' && <MessDetailsSection currentMess={currentMess} isManager={isManager} />}

        {activeTab === 'notifications' && (
          <PushNotificationSection
            pushEnabled={pushEnabled}
            pushLoading={pushLoading}
            onToggle={handlePushToggle}
          />
        )}

        {activeTab === 'danger' && (
          <DangerZone
            hasMess={!!currentMess}
            isManager={isManager}
            messName={currentMess?.name}
            onLeave={() => setConfirmLeaveOpen(true)}
            onDelete={() => setConfirmDeleteOpen(true)}
            onDeleteAccount={() => setConfirmDeleteAccountOpen(true)}
          />
        )}
      </div>

      {/* Version Footer */}
      <div className="text-center py-4 text-xs text-nex-muted border-t border-nex-border/30">
        NexMess v{pkg.version}
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmLeaveOpen}
        title="Leave Mess"
        message="Are you sure you want to leave this mess? You will lose access immediately, but your past data will be kept for calculations."
        confirmText="Leave Mess"
        variant="warning"
        onConfirm={handleConfirmLeaveMess}
        onCancel={() => setConfirmLeaveOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteAccountOpen}
        title="Delete Account"
        message="DANGER: Are you sure you want to delete your account? Your account will be deactivated immediately. You will have 30 days to log back in to restore your account, otherwise all your personal profile info will be permanently deleted."
        confirmText="Deactivate Account"
        confirmInput={profile?.username || ''}
        confirmInputLabel={`Type your username "${profile?.username || ''}" to confirm`}
        variant="danger"
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => setConfirmDeleteAccountOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Mess Permanently"
        message={`DANGER: Are you sure you want to delete "${currentMess?.name}" permanently? This will erase all history, meals, chat, and deposits for all members. This cannot be undone.`}
        confirmText="Permanently Delete"
        confirmInput={currentMess?.name}
        confirmInputLabel={`Type the mess name "${currentMess?.name}" to confirm`}
        variant="danger"
        onConfirm={handleConfirmDeleteMess}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmDialog
        open={removeMemberId !== null}
        title="Remove Member"
        message="Are you sure you want to remove this member? Their past data will be preserved for calculations."
        confirmText="Remove"
        variant="danger"
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => setRemoveMemberId(null)}
      />

      <ConfirmDialog
        open={promoteMemberId !== null}
        title="Promote Member"
        message="Promote this member to manager? They will have full manager controls, including history logs and settings access."
        confirmText="Promote"
        variant="info"
        onConfirm={handleConfirmPromoteMember}
        onCancel={() => setPromoteMemberId(null)}
      />

      <ConfirmDialog
        open={demoteMemberId !== null}
        title="Demote Manager"
        message={demoteMemberId === user?.id ? "Are you sure you want to demote yourself? You will lose manager access immediately." : "Demote this manager back to a regular member?"}
        confirmText="Demote"
        variant="warning"
        onConfirm={handleConfirmDemoteMember}
        onCancel={() => setDemoteMemberId(null)}
      />

      {/* Support / Contact Floating Button */}
      <button
        onClick={() => setIsSupportOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-nex-primary text-white shadow-xl shadow-nex-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
        aria-label="Support and Contact"
      >
        <MessageCircle className="w-6 h-6 group-hover:animate-pulse" />
      </button>

      {/* Support Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  )
}
