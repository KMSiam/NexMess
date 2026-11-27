import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { isMealCutoffPassed, dhakaToday, dhakaTomorrow, isApprovedManager } from '../../lib/utils'
import { getPendingInviteCode } from '../../lib/invite'
import { sendPushToUsers } from '../../lib/push'
import { sanitizeAppError } from '../../lib/errorHandler'
import toast from 'react-hot-toast'
import { CardSkeleton, ListSkeleton, Skeleton } from '../../components/Skeleton'
import ConfirmDialog from '../../components/ConfirmDialog'

// Custom Hooks
import { useDashboardData } from '../../hooks/useDashboardData'
import { usePageTitle } from '../../hooks/usePageTitle'

// Sub-components
import WelcomeCard from './components/WelcomeCard'
import NoticeBoard from './components/NoticeBoard'
import AlertBanners from './components/AlertBanners'
import CookSummary from './components/CookSummary'
import MealSelector from './components/MealSelector'
import StatsGrid from './components/StatsGrid'
import RecentActivity from './components/RecentActivity'
import BazaarScheduleCard from './components/BazaarScheduleCard'
import EmergencyContacts from './components/EmergencyContacts'

export default function DashboardPage() {
  const { t } = useTranslation()
  usePageTitle(t('nav.dashboard'))

  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const { currentMess, messes, loading: messLoading, members, pendingRequests, cancelJoinRequest } = useMessStore()

  useEffect(() => {
    if (messLoading || currentMess || messes.length > 0 || pendingRequests.length > 0) return
    const pendingInvite = getPendingInviteCode()
    if (pendingInvite) {
      navigate(`/join/${encodeURIComponent(pendingInvite)}`, { replace: true })
    }
  }, [messLoading, currentMess, messes.length, pendingRequests.length, navigate])

  const [mealLoading, setMealLoading] = useState(false)

  // Custom Hook for dashboard data loading and realtime updates
  const {
    mealsData,
    routines,
    cookSummary,
    upcomingBazaar,
    unpaidFixed,
    recentActs,
    stats,
    isBazaarMan,
    notice,
    emergencyContacts,
    dataLoaded,
    setMealsData,
    setNotice,
    setEmergencyContacts,
  } = useDashboardData(profile?.id, profile?.username || undefined, currentMess?.id)

  // Emergency Contact Delete Dialog State
  const [deleteEcId, setDeleteEcId] = useState<string | null>(null)

  const isManager = isApprovedManager(members, profile?.id)

  const handleSaveNotice = async (text: string) => {
    if (!currentMess?.id || !profile?.id) return

    // Deactivate any existing notice first
    if (notice) {
      await supabase.from('notices').update({ is_active: false }).eq('id', notice.id)
    }

    const { data, error } = await supabase
      .from('notices')
      .insert({
        mess_id: currentMess.id,
        message: text,
        created_by: profile.id,
      })
      .select('id, message')
      .single()

    if (error) {
      toast.error('Failed to post notice')
    } else {
      toast.success('Notice posted!')
      setNotice(data)
      // Push notification to all mess members (fire-and-forget)
      const memberIds = members
        .filter((m) => m.status === 'approved' && m.user_id !== profile.id)
        .map((m) => m.user_id)
      sendPushToUsers(memberIds, `📢 ${currentMess.name}`, text, '/dashboard')
    }
  }

  const handleDismissNotice = async () => {
    if (!notice) return
    await supabase.from('notices').update({ is_active: false }).eq('id', notice.id)
    setNotice(null)
    toast.success('Notice removed')
  }

  const handleAddEC = async (name: string, phone: string) => {
    if (!currentMess?.id) return

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({
        mess_id: currentMess.id,
        name,
        phone,
      })
      .select('id, name, phone')
      .single()

    if (error) {
      toast.error('Failed to add contact')
    } else {
      toast.success('Contact added!')
      setEmergencyContacts((prev) => [...prev, data])
    }
  }

  const confirmDeleteEC = async () => {
    if (!deleteEcId) return
    await supabase.from('emergency_contacts').delete().eq('id', deleteEcId)
    setEmergencyContacts((prev) => prev.filter((ec) => ec.id !== deleteEcId))
    setDeleteEcId(null)
    toast.success('Contact removed')
  }

  const handleToggleMeal = async (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => {
    if (!profile?.id || !currentMess?.id) return
    const targetDateStr = tab === 'today' ? dhakaToday() : dhakaTomorrow()

    if (isMealCutoffPassed(targetDateStr, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off has passed`)
      return
    }

    setMealLoading(true)
    const mData = mealsData[tab]
    const newValue = type === 'lunch' ? !mData.lunch : !mData.dinner

    setMealsData((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [type]: newValue },
    }))

    const { error } = await supabase.from('meals').upsert(
      {
        user_id: profile.id,
        mess_id: currentMess.id,
        date: targetDateStr,
        [type]: newValue,
      },
      { onConflict: 'user_id,mess_id,date' }
    )

    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to update meal'))
      setMealsData((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], [type]: !newValue },
      }))
    }
    setMealLoading(false)
  }

  const handleUpdateGuest = async (
    tab: 'today' | 'tomorrow',
    type: 'lunch' | 'dinner',
    delta: number
  ) => {
    if (!profile?.id || !currentMess?.id) return
    const targetDateStr = tab === 'today' ? dhakaToday() : dhakaTomorrow()

    if (isMealCutoffPassed(targetDateStr, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off has passed`)
      return
    }

    setMealLoading(true)
    const mData = mealsData[tab]
    const key = type === 'lunch' ? 'gl' : 'gd'
    const newVal = Math.max(0, mData[key] + delta)

    setMealsData((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: newVal },
    }))

    const guestCol = type === 'lunch' ? 'guest_lunch' : 'guest_dinner'
    const { error } = await supabase.from('meals').upsert(
      {
        user_id: profile.id,
        mess_id: currentMess.id,
        date: targetDateStr,
        [guestCol]: newVal,
      },
      { onConflict: 'user_id,mess_id,date' }
    )

    if (error) {
      toast.error(sanitizeAppError(error, 'Failed to update guests'))
      setMealsData((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], [key]: mData[key] },
      }))
    }
    setMealLoading(false)
  }

  if (!currentMess) {
    return (
      <div className="mx-auto max-w-lg space-y-8 py-12">
        <div className="text-center">
          <div className="bg-nex-primary-light mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <Users className="text-nex-primary h-8 w-8" />
          </div>
          <h1 className="text-nex-text mb-2 text-2xl font-bold">
            {t('dashboard.noMess.title')}
          </h1>
          <p className="text-nex-muted mb-6">
            {t('dashboard.noMess.description')}
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/mess/create" className="nex-btn-primary">
              <Plus className="h-4 w-4" /> {t('dashboard.noMess.create')}
            </Link>
            <Link to="/mess/join" className="nex-btn-secondary">
              {t('dashboard.noMess.join')}
            </Link>
          </div>
        </div>

        {pendingRequests && pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-nex-muted text-center text-xs font-bold tracking-wider uppercase">
              {t('dashboard.noMess.pendingRequests')}
            </h2>
            {pendingRequests.map((req) => (
              <div
                key={req.mess_id}
                className="nex-card flex items-center justify-between border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="nex-avatar-mess flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-bold text-white shadow-inner">
                    {req.messes?.avatar_url ? (
                      <img src={req.messes.avatar_url} alt="" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      req.messes?.name?.[0] || '?'
                    )}
                  </div>
                  <div>
                    <h3 className="text-nex-text font-semibold">
                      {req.messes?.name || 'Unknown Mess'}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-500">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                      </span>
                      {t('dashboard.noMess.waitingApproval')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (profile?.id) {
                      cancelJoinRequest(req.mess_id, profile.id)
                      toast.success('Request canceled')
                    }
                  }}
                  className="bg-nex-danger-light text-nex-danger rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 hover:bg-rose-600 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!dataLoaded) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Welcome Skeleton */}
        <div className="nex-card flex items-center justify-between p-5">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>

        {/* Cook's Summary Skeleton */}
        <div className="nex-card bg-nex-elevated h-32 p-5">
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Lower Grid Skeleton */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="nex-card space-y-4 p-5">
            <Skeleton className="h-4 w-32" />
            <ListSkeleton count={3} />
          </div>
          <div className="nex-card space-y-4 p-5">
            <Skeleton className="h-4 w-32" />
            <ListSkeleton count={3} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in mx-auto max-w-5xl space-y-5">
      <WelcomeCard username={profile?.username} isManager={isManager} />

      {/* 2-column grid for Pinned Notice and Mess Alerts */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <NoticeBoard
          notice={notice}
          isManager={isManager}
          onSaveNotice={handleSaveNotice}
          onDismissNotice={handleDismissNotice}
        />

        <AlertBanners
          mealsData={mealsData}
          stats={stats}
          unpaidFixed={unpaidFixed}
          isBazaarMan={isBazaarMan}
          isManager={isManager}
          onQuickMealToggle={handleToggleMeal}
        />
      </div>

      {/* 2-column grid for Cook's Summary and My Meals */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <CookSummary data={cookSummary} />
        <MealSelector
          mealsData={mealsData}
          routines={routines}
          mealLoading={mealLoading}
          onToggleMeal={handleToggleMeal}
          onUpdateGuest={handleUpdateGuest}
        />
      </div>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RecentActivity activities={recentActs} />
        <BazaarScheduleCard schedule={upcomingBazaar} />
      </div>

      <EmergencyContacts
        contacts={emergencyContacts}
        isManager={isManager}
        onAdd={handleAddEC}
        onDelete={setDeleteEcId}
      />

      {/* Reusable Confirmation Dialog for Emergency Contact Deletion */}
      <ConfirmDialog
        open={deleteEcId !== null}
        title={t('dashboard.deleteContactTitle')}
        message={t('dashboard.deleteContactConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeleteEC}
        onCancel={() => setDeleteEcId(null)}
      />
    </div>
  )
}
