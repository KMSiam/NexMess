import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  User,
  Users,
  Home,
  Bell,
  AlertTriangle,
  MessageCircle,
  Languages,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { isSubscribed, subscribeToPush, unsubscribeFromPush } from '../../lib/push'
import toast from 'react-hot-toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import SupportModal from '../../components/SupportModal'
import { APP_VERSION } from '../../lib/version'
import { sanitizeAppError } from '../../lib/errorHandler'
import { formatNumber, isApprovedManager } from '../../lib/utils'

import { usePageTitle } from '../../hooks/usePageTitle'
import ProfileSection from './components/ProfileSection'
import PushNotificationSection from './components/PushNotificationSection'
import MessDetailsSection from './components/MessDetailsSection'
import MemberManagement from './components/MemberManagement'
import PreferencesSection from './components/PreferencesSection'
import DangerZone from './components/DangerZone'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('settings.title'))
  const navigate = useNavigate()
  const { profile, user, updateProfile } = useAuthStore()
  const { currentMess, members, fetchMembers, fetchUserMesses } = useMessStore()

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<
    'profile' | 'members' | 'mess' | 'notifications' | 'preferences' | 'danger'
  >('profile')
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const tabSliderRef = useRef<HTMLDivElement>(null)
  const [tabScrollState, setTabScrollState] = useState({ left: false, right: false })

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDeleteAccountOpen, setConfirmDeleteAccountOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [promoteMemberId, setPromoteMemberId] = useState<string | null>(null)
  const [demoteMemberId, setDemoteMemberId] = useState<string | null>(null)

  const isManager = isApprovedManager(members, user?.id)
  const pendingMembers = members.filter((m) => m.status === 'pending')
  const approvedMembers = members.filter((m) => m.status === 'approved')

  useEffect(() => {
    isSubscribed().then(setPushEnabled)
  }, [])

  const updateTabScrollState = useCallback(() => {
    const el = tabSliderRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setTabScrollState({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    const el = tabSliderRef.current
    if (!el) return
    updateTabScrollState()
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateTabScrollState) : null
    observer?.observe(el)
    window.addEventListener('resize', updateTabScrollState)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateTabScrollState)
    }
  }, [updateTabScrollState, i18n.language, pendingMembers.length])

  const scrollTabs = (direction: 'left' | 'right') => {
    tabSliderRef.current?.scrollBy({
      left: direction === 'left' ? -180 : 180,
      behavior: 'smooth',
    })
  }

  const settingsTabs = [
    { key: 'profile' as const, label: t('settings.tabs.profile'), icon: User },
    {
      key: 'members' as const,
      label: t('settings.tabs.members'),
      icon: Users,
      badge: pendingMembers.length > 0 ? pendingMembers.length : undefined,
    },
    { key: 'mess' as const, label: t('settings.tabs.mess'), icon: Home },
    { key: 'notifications' as const, label: t('settings.tabs.notifications'), icon: Bell },
    { key: 'preferences' as const, label: t('settings.tabs.preferences'), icon: Languages },
    {
      key: 'danger' as const,
      label: t('settings.tabs.danger'),
      icon: AlertTriangle,
      danger: true,
    },
  ]

  useEffect(() => {
    if (currentMess?.id) {
      fetchMembers(currentMess.id)

      // Real-time listener for member status changes
      const channel = supabase
        .channel(`members-${currentMess.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mess_members',
            filter: `mess_id=eq.${currentMess.id}`,
          },
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
    await supabase
      .from('mess_members')
      .update({ status: 'approved' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', userId)
    toast.success('Member approved!')
    fetchMembers(currentMess.id)
  }

  const handleToggleVerify = async (userId: string, isVerified: boolean) => {
    if (!currentMess?.id) return
    const { error } = await supabase.rpc('manager_verify_member', {
      p_user_id: userId,
      p_mess_id: currentMess.id,
      p_is_verified: isVerified,
    })

    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to update verification status'))
    } else {
      toast.success(isVerified ? 'Profile verified!' : 'Profile unverified')
      fetchMembers(currentMess.id)
    }
  }

  const handleReject = async (userId: string) => {
    if (!currentMess?.id) return

    if (currentMess.name) {
      await supabase.from('notifications').insert({
        user_id: userId,
        mess_id: currentMess.id,
        type: 'join_rejected',
        title: 'Request rejected',
        body: `Your request to join ${currentMess.name} has been declined.`,
      })
    }

    await supabase.from('mess_members').delete().eq('mess_id', currentMess.id).eq('user_id', userId)

    toast.success('Request rejected')
    fetchMembers(currentMess.id)
  }

  const handleConfirmRemoveMember = async () => {
    if (!currentMess?.id || !removeMemberId || !user) return

    const targetMember = approvedMembers.find((m) => m.user_id === removeMemberId)
    const isTargetManager = targetMember?.role === 'manager'
    const managersCount = approvedMembers.filter((m) => m.role === 'manager').length

    if (isTargetManager && managersCount === 1) {
      toast.error(
        'This member is the only manager. Make someone else manager or delete the mess to remove them.'
      )
      setRemoveMemberId(null)
      return
    }

    const { error } = await supabase
      .from('mess_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('mess_id', currentMess.id)
      .eq('user_id', removeMemberId)

    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to remove member'))
    } else {
      toast.success('Member removed but past data saved')
      const isSelf = removeMemberId === user.id
      setRemoveMemberId(null)

      if (isSelf) {
        await fetchUserMesses(user.id)
        navigate('/')
      } else {
        if (currentMess.name) {
          await supabase.from('notifications').insert({
            user_id: removeMemberId,
            mess_id: currentMess.id,
            type: 'member_removed',
            title: 'Removed from mess',
            body: `You have been removed from ${currentMess.name} by the manager.`,
          })
        }
        fetchMembers(currentMess.id)
      }
    }
  }

  const handleConfirmPromoteMember = async () => {
    if (!currentMess?.id || !promoteMemberId) return
    const managersCount = approvedMembers.filter((m) => m.role === 'manager').length
    if (managersCount >= 3) {
      toast.error('Maximum 3 managers allowed per mess')
      setPromoteMemberId(null)
      return
    }

    await supabase
      .from('mess_members')
      .update({ role: 'manager' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', promoteMemberId)
    toast.success('Member promoted to manager')
    setPromoteMemberId(null)
    fetchMembers(currentMess.id)
  }

  const handleConfirmDemoteMember = async () => {
    if (!currentMess?.id || !demoteMemberId) return
    const managersCount = approvedMembers.filter((m) => m.role === 'manager').length
    if (managersCount <= 1) {
      toast.error('Cannot demote the last manager')
      setDemoteMemberId(null)
      return
    }

    await supabase
      .from('mess_members')
      .update({ role: 'member' })
      .eq('mess_id', currentMess.id)
      .eq('user_id', demoteMemberId)

    toast.success('Manager demoted to member')

    // If manager demoted themselves, redirect to dashboard to refresh permissions
    if (demoteMemberId === user?.id) {
      navigate('/dashboard')
    } else {
      fetchMembers(currentMess.id)
    }
    setDemoteMemberId(null)
  }

  const handleConfirmLeaveMess = async () => {
    if (!currentMess || !user) return
    const managersCount = approvedMembers.filter((m) => m.role === 'manager').length
    if (isManager && managersCount === 1) {
      toast.error(
        'You are the only manager. Make someone else manager or delete the mess to leave.'
      )
      setConfirmLeaveOpen(false)
      return
    }

    const { error } = await supabase
      .from('mess_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('mess_id', currentMess.id)
      .eq('user_id', user.id)

    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to leave mess'))
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
      toast.error(sanitizeAppError(error, 'Failed to delete mess'))
    } else {
      toast.success('Mess permanently deleted.')
      setConfirmDeleteOpen(false)
      await fetchUserMesses(user.id)
      navigate('/')
    }
  }

  const handleConfirmDeleteAccount = async () => {
    if (!user?.id) return

    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to deactivate account'))
    } else {
      toast.success('Account deactivated. Signing out...')
      setConfirmDeleteAccountOpen(false)
      const { signOut } = useAuthStore.getState()
      await signOut()
      navigate('/')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Settings className="text-nex-primary h-6 w-6" />
          <h1 className="text-nex-text text-2xl font-bold">{t('settings.title')}</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsSupportOpen(true)}
          className="nex-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          aria-label={t('support.title')}
        >
          <MessageCircle className="text-nex-primary h-3.5 w-3.5" />
          <span>{t('support.title')}</span>
        </button>
      </div>

      <div className="bg-nex-elevated border-nex-border/80 relative overflow-hidden rounded-xl border p-1.5">
        {tabScrollState.left && (
          <div className="from-nex-elevated via-nex-elevated/90 pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r to-transparent pr-4 pl-1.5">
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              aria-label="Scroll settings sections left"
              className="bg-nex-surface border-nex-border/80 text-nex-muted hover:text-nex-text pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          ref={tabSliderRef}
          role="tablist"
          onScroll={updateTabScrollState}
          className="scrollbar-none flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto scroll-smooth whitespace-nowrap sm:justify-between"
        >
          {settingsTabs.map(({ key, label, icon: Icon, badge, danger }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={(e) => {
                  setActiveTab(key)
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'nearest',
                    block: 'nearest',
                  })
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:text-sm ${
                  danger
                    ? isActive
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-nex-muted hover:bg-nex-danger-light hover:text-nex-danger'
                    : isActive
                      ? 'bg-nex-primary text-white shadow-md'
                      : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover/50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
                {badge !== undefined && (
                  <span
                    className={`inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isActive ? 'text-nex-danger bg-white' : 'bg-nex-danger animate-pulse text-white'
                    }`}
                  >
                    {formatNumber(badge)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {tabScrollState.right && (
          <div className="from-nex-elevated via-nex-elevated/90 pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l to-transparent pr-1.5 pl-4">
            <button
              type="button"
              onClick={() => scrollTabs('right')}
              aria-label="Scroll settings sections right"
              className="bg-nex-surface border-nex-border/80 text-nex-muted hover:text-nex-text pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 min-h-[300px]">
        {activeTab === 'profile' && (
          <ProfileSection profile={profile} email={user?.email} onUpdate={handleProfileUpdate} />
        )}

        {activeTab === 'members' && (
          <MemberManagement
            pendingMembers={pendingMembers}
            approvedMembers={approvedMembers}
            isManager={isManager}
            currentUserId={user?.id}
            onApprove={handleApprove}
            onReject={handleReject}
            onRemove={setRemoveMemberId}
            onMakeManager={setPromoteMemberId}
            onDemoteManager={setDemoteMemberId}
            onToggleVerify={handleToggleVerify}
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

        {activeTab === 'preferences' && <PreferencesSection />}

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

      <div className="text-nex-muted border-nex-border/30 border-t py-4 text-center text-xs">
        NexMess v{formatNumber(APP_VERSION)}
      </div>

      <ConfirmDialog
        open={confirmLeaveOpen}
        title={t('settings.dangerSection.leaveTitle')}
        message={t('settings.dangerSection.leaveDesc')}
        confirmText={t('settings.dangerSection.leaveTitle')}
        cancelText={t('common.cancel')}
        variant="warning"
        onConfirm={handleConfirmLeaveMess}
        onCancel={() => setConfirmLeaveOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteAccountOpen}
        title={t('settings.dangerSection.deleteAccountTitle')}
        message={t('settings.dangerSection.deleteAccountDesc')}
        confirmText={t('settings.dangerSection.deleteAccountTitle')}
        cancelText={t('common.cancel')}
        confirmInput={profile?.username || ''}
        confirmInputLabel={t('settings.dangerSection.confirmUsername', {
          name: profile?.username || '',
        })}
        variant="danger"
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => setConfirmDeleteAccountOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('settings.dangerSection.deleteMessTitle')}
        message={t('settings.dangerSection.deleteMessDesc')}
        confirmText={t('settings.dangerSection.deleteMessTitle')}
        cancelText={t('common.cancel')}
        confirmInput={currentMess?.name}
        confirmInputLabel={t('settings.dangerSection.confirmMessName', {
          name: currentMess?.name || '',
        })}
        variant="danger"
        onConfirm={handleConfirmDeleteMess}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmDialog
        open={removeMemberId !== null}
        title={t('settings.memberSection.removeMember')}
        message={t('settings.memberSection.confirmRemove')}
        confirmText={t('settings.memberSection.removeMember')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => setRemoveMemberId(null)}
      />

      <ConfirmDialog
        open={promoteMemberId !== null}
        title={t('settings.memberSection.makeManager')}
        message={t('settings.memberSection.confirmPromote')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="info"
        onConfirm={handleConfirmPromoteMember}
        onCancel={() => setPromoteMemberId(null)}
      />

      <ConfirmDialog
        open={demoteMemberId !== null}
        title={t('settings.memberSection.demoteManager')}
        message={
          demoteMemberId === user?.id
            ? t('settings.memberSection.confirmDemoteSelf')
            : t('settings.memberSection.confirmDemoteOther')
        }
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="warning"
        onConfirm={handleConfirmDemoteMember}
        onCancel={() => setDemoteMemberId(null)}
      />

      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  )
}
