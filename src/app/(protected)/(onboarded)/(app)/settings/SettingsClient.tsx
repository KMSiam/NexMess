'use client'

import { useEffect, useState, useCallback } from 'react'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Settings, User, Users, Home, Bell, AlertTriangle, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import SupportModal from '@/components/SupportModal'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'

// Server Actions
import { updateProfile, deactivateAccount } from '@/actions/profile'
import {
  getMessMembers,
  approveMember,
  rejectJoinRequest,
  removeMember,
  changeMemberRole,
  leaveMess,
  deleteMess,
  getUserMesses,
} from '@/actions/mess'
import { addPushSubscription, removePushSubscription, checkPushSubscription } from '@/actions/push'

// Sub-components
import ProfileSection from './components/ProfileSection'
import PushNotificationSection from './components/PushNotificationSection'
import MessDetailsSection from './components/MessDetailsSection'
import MemberManagement from './components/MemberManagement'
import DangerZone from './components/DangerZone'

const VERSION = '1.0.0'

export default function SettingsClient() {
  const router = useRouter()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const { profile, setProfile } = useProfileStore()
  const {
    currentMess,
    setCurrentMess,
    messes,
    setMesses,
    pendingRequests,
    setPendingRequests,
    members,
    setMembers,
  } = useMessStore()

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(true) // Start loading to check status

  const [activeTab, setActiveTab] = useState<'profile' | 'members' | 'mess' | 'notifications' | 'danger'>('profile')
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  // Helper to convert base64 VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = window.atob(base64)
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
  }

  // Check active push subscription on mount
  useEffect(() => {
    async function checkSubscription() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushLoading(false)
        return
      }

      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub && Notification.permission === 'granted') {
          // Verify with database that the subscription is registered
          const isSubInDb = await checkPushSubscription(sub.endpoint)
          setPushEnabled(isSubInDb)
        } else {
          setPushEnabled(false)
        }
      } catch (err) {
        console.error('Failed to check push subscription status:', err)
        setPushEnabled(false)
      } finally {
        setPushLoading(false)
      }
    }

    checkSubscription()
  }, [])

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDeleteAccountOpen, setConfirmDeleteAccountOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [promoteMemberId, setPromoteMemberId] = useState<string | null>(null)
  const [demoteMemberId, setDemoteMemberId] = useState<string | null>(null)

  const isManager = members.some((m) => m.user_id === profile?.id && m.role === 'manager')
  const pendingMembers = members.filter((m) => m.status === 'pending')
  const approvedMembers = members.filter((m) => m.status === 'approved')

  const fetchMembersList = useCallback(async () => {
    if (!currentMess?.id) return
    try {
      const data = await getMessMembers(currentMess.id)
      setMembers(data)
    } catch (err) {
      console.error('Failed to fetch members:', err)
    }
  }, [currentMess?.id, setMembers])

  useEffect(() => {
    if (currentMess?.id) {
      fetchMembersList()
    }
  }, [currentMess?.id, fetchMembersList])

  // Pusher realtime subscription
  usePusherRealtime(currentMess?.id, ['mess_members'], fetchMembersList)

  const handlePushToggle = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported on this browser.')
      return
    }

    const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!VAPID_KEY) {
      toast.error('Push notification credentials are not configured on the server.')
      return
    }

    setPushLoading(true)

    try {
      const reg = await navigator.serviceWorker.ready

      if (pushEnabled) {
        // Toggle OFF: Unsubscribe locally & delete from DB
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await removePushSubscription(sub.endpoint)
        }
        setPushEnabled(false)
        toast.success('Push notifications disabled')
      } else {
        // Toggle ON: Request permission and subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Notifications blocked. Please enable them in browser settings.')
          setPushLoading(false)
          return
        }

        // Unsubscribe from any stale subscriptions first
        const existingSub = await reg.pushManager.getSubscription()
        if (existingSub) {
          await existingSub.unsubscribe()
        }

        // Create new subscription
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as any,
        })

        const subJson = sub.toJSON()
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          throw new Error('Subscription object is incomplete')
        }

        // Save to DB
        await addPushSubscription(subJson.endpoint, subJson.keys.p256dh, subJson.keys.auth)
        setPushEnabled(true)
        toast.success('Push notifications enabled!')
      }
    } catch (err: any) {
      console.error('Failed to toggle push notifications:', err)
      toast.error(err.message || 'Push subscription failed')
    } finally {
      setPushLoading(false)
    }
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
    try {
      const res = await updateProfile({
        username,
        contact_no: contactNo,
        avatar_url: avatarUrl,
        verification_doc_type: verificationDocType,
        verification_doc_no: verificationDocNo,
        verification_doc_url: verificationDocUrl,
        emergency_contact_no: emergencyContactNo,
      })
      if (res.success && res.profile) {
        setProfile(res.profile)
        toast.success('Profile updated!')
      } else {
        toast.error(res.error || 'Failed to update profile')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    }
  }

  const handleApprove = async (userId: string) => {
    if (!currentMess?.id) return
    try {
      await approveMember(currentMess.id, userId)
      toast.success('Member approved!')
      fetchMembersList()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve member')
    }
  }

  const handleReject = async (userId: string) => {
    if (!currentMess?.id) return
    try {
      await rejectJoinRequest(currentMess.id, userId)
      toast.success('Request rejected')
      fetchMembersList()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request')
    }
  }

  const handleConfirmRemoveMember = async () => {
    if (!currentMess?.id || !removeMemberId) return
    try {
      await removeMember(currentMess.id, removeMemberId)
      toast.success('Member removed but past data saved')
      setRemoveMemberId(null)
      fetchMembersList()
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member')
    }
  }

  const handleConfirmPromoteMember = async () => {
    if (!currentMess?.id || !promoteMemberId) return
    try {
      await changeMemberRole(currentMess.id, promoteMemberId, 'manager')
      toast.success('Member promoted to manager')
      setPromoteMemberId(null)
      fetchMembersList()
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote member')
    }
  }

  const handleConfirmDemoteMember = async () => {
    if (!currentMess?.id || !demoteMemberId) return
    try {
      await changeMemberRole(currentMess.id, demoteMemberId, 'member')
      toast.success('Manager demoted to member')

      if (demoteMemberId === profile?.id) {
        router.push('/dashboard')
      } else {
        fetchMembersList()
      }
      setDemoteMemberId(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to demote manager')
    }
  }

  const handleConfirmLeaveMess = async () => {
    if (!currentMess) return
    try {
      await leaveMess(currentMess.id)
      toast.success('You have left the mess.')
      setConfirmLeaveOpen(false)

      const userMesses = await getUserMesses()
      setMesses(userMesses.messes)
      setPendingRequests(userMesses.pendingRequests)

      if (userMesses.messes.length > 0) {
        setCurrentMess(userMesses.messes[0])
        router.push('/dashboard')
      } else {
        setCurrentMess(null)
        router.push('/onboarding')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave mess')
    }
  }

  const handleConfirmDeleteMess = async () => {
    if (!currentMess) return
    try {
      await deleteMess(currentMess.id)
      toast.success('Mess permanently deleted.')
      setConfirmDeleteOpen(false)

      const userMesses = await getUserMesses()
      setMesses(userMesses.messes)
      setPendingRequests(userMesses.pendingRequests)

      if (userMesses.messes.length > 0) {
        setCurrentMess(userMesses.messes[0])
        router.push('/dashboard')
      } else {
        setCurrentMess(null)
        router.push('/onboarding')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete mess')
    }
  }

  const handleConfirmDeleteAccount = async () => {
    try {
      await deactivateAccount()
      toast.success('Account deactivated. Signing out...')
      setConfirmDeleteAccountOpen(false)
      await signOut()
      router.push('/')
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate account')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="text-nex-primary h-6 w-6" />
        <h1 className="text-nex-text text-2xl font-bold">Settings</h1>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-nex-elevated border-nex-border/80 scrollbar-none flex w-full max-w-full gap-1.5 overflow-x-auto rounded-xl border p-1 whitespace-nowrap">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
            activeTab === 'members'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Members</span>
          {pendingMembers.length > 0 && (
            <span className="bg-nex-danger ring-nex-bg absolute -top-1 -right-1 flex h-4.5 w-4.5 animate-pulse items-center justify-center rounded-full text-[9px] font-bold text-white ring-2">
              {pendingMembers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mess')}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
            activeTab === 'mess'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Mess Info</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-nex-primary text-white shadow-md'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('danger')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
            activeTab === 'danger'
              ? 'bg-red-500 text-white shadow-md'
              : 'text-nex-muted hover:bg-red-500/10 hover:text-red-500'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Danger Zone</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-4 min-h-[300px]">
        {activeTab === 'profile' && (
          <ProfileSection
            profile={profile}
            email={clerkUser?.emailAddresses[0]?.emailAddress}
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

        {activeTab === 'mess' && (
          <MessDetailsSection currentMess={currentMess} isManager={isManager} />
        )}

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
      <div className="text-nex-muted border-nex-border/30 border-t py-4 text-center text-xs">
        NexMess v{VERSION}
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
        confirmInput={currentMess?.name || ''}
        confirmInputLabel={`Type the mess name "${currentMess?.name || ''}" to confirm`}
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
        message={
          demoteMemberId === profile?.id
            ? 'Are you sure you want to demote yourself? You will lose manager access immediately.'
            : 'Demote this manager back to a regular member?'
        }
        confirmText="Demote"
        variant="warning"
        onConfirm={handleConfirmDemoteMember}
        onCancel={() => setDemoteMemberId(null)}
      />

      {/* Support / Contact Floating Button */}
      <button
        onClick={() => setIsSupportOpen(true)}
        className="bg-nex-primary shadow-nex-primary/30 group fixed right-6 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 md:bottom-6 cursor-pointer"
        aria-label="Support and Contact"
      >
        <MessageCircle className="h-6 w-6 group-hover:animate-pulse" />
      </button>

      {/* Support Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  )
}
