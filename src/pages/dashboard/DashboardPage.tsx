import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { isMealCutoffPassed, dhakaToday } from '../../lib/utils'
import { sendPushToUsers } from '../../lib/push'
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
  usePageTitle('Dashboard')

  const { profile } = useAuthStore()
  const { currentMess, members } = useMessStore()
  
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

  const isManager = members.some(m => m.user_id === profile?.id && m.role === 'manager')

  const handleSaveNotice = async (text: string) => {
    if (!currentMess?.id || !profile?.id) return

    // Deactivate any existing notice first
    if (notice) {
      await supabase.from('notices').update({ is_active: false }).eq('id', notice.id)
    }

    const { data, error } = await supabase.from('notices').insert({
      mess_id: currentMess.id, message: text, created_by: profile.id
    }).select('id, message').single()

    if (error) {
      toast.error('Failed to post notice')
    } else {
      toast.success('Notice posted!')
      setNotice(data)
      // Push notification to all mess members (fire-and-forget)
      const memberIds = members
        .filter(m => m.status === 'approved' && m.user_id !== profile.id)
        .map(m => m.user_id)
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
    
    const { data, error } = await supabase.from('emergency_contacts').insert({
      mess_id: currentMess.id, name, phone
    }).select('id, name, phone').single()

    if (error) {
      toast.error('Failed to add contact')
    } else {
      toast.success('Contact added!')
      setEmergencyContacts(prev => [...prev, data])
    }
  }

  const confirmDeleteEC = async () => {
    if (!deleteEcId) return
    await supabase.from('emergency_contacts').delete().eq('id', deleteEcId)
    setEmergencyContacts(prev => prev.filter(ec => ec.id !== deleteEcId))
    setDeleteEcId(null)
    toast.success('Contact removed')
  }

  const handleToggleMeal = async (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => {
    if (!profile?.id || !currentMess?.id) return
    const todayStr = dhakaToday() 
    const targetDateStr = tab === 'today' 
      ? todayStr 
      : (() => {
          const t = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
          return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
        })()

    if (isMealCutoffPassed(targetDateStr, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off has passed`)
      return
    }

    setMealLoading(true)
    const mData = mealsData[tab]
    const newValue = type === 'lunch' ? !mData.lunch : !mData.dinner

    setMealsData(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [type]: newValue }
    }))

    const { error } = await supabase.from('meals').upsert({
      user_id: profile.id, mess_id: currentMess.id, date: targetDateStr,
      [type]: newValue,
    }, { onConflict: 'user_id,mess_id,date' })

    if (error) {
      toast.error(error.message || 'Failed to update meal')
      setMealsData(prev => ({
        ...prev,
        [tab]: { ...prev[tab], [type]: !newValue }
      }))
    }
    setMealLoading(false)
  }

  const handleUpdateGuest = async (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner', delta: number) => {
    if (!profile?.id || !currentMess?.id) return
    const targetDateStr = tab === 'today' 
      ? dhakaToday() 
      : (() => {
          const t = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
          return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
        })()

    if (isMealCutoffPassed(targetDateStr, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off has passed`)
      return
    }

    setMealLoading(true)
    const mData = mealsData[tab]
    const key = type === 'lunch' ? 'gl' : 'gd'
    const newVal = Math.max(0, mData[key] + delta)

    setMealsData(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: newVal }
    }))

    const guestCol = type === 'lunch' ? 'guest_lunch' : 'guest_dinner'
    const { error } = await supabase.from('meals').upsert({
      user_id: profile.id, mess_id: currentMess.id, date: targetDateStr,
      [guestCol]: newVal,
    }, { onConflict: 'user_id,mess_id,date' })

    if (error) {
      toast.error(error.message || 'Failed to update guests')
      setMealsData(prev => ({
        ...prev,
        [tab]: { ...prev[tab], [key]: mData[key] }
      }))
    }
    setMealLoading(false)
  }

  if (!currentMess) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-nex-primary-light mx-auto flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-nex-primary" />
        </div>
        <h2 className="text-2xl font-bold text-nex-text mb-2">No mess joined yet</h2>
        <p className="text-nex-muted mb-6">Create a new mess or join an existing one with a code.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/mess/create" className="nex-btn-primary"><Plus className="w-4 h-4" /> Create Mess</Link>
          <Link to="/mess/join" className="nex-btn-secondary">Join Mess</Link>
        </div>
      </div>
    )
  }

  if (!dataLoaded) {
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Welcome Skeleton */}
        <div className="nex-card p-5 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>

        {/* Cook's Summary Skeleton */}
        <div className="nex-card p-5 h-32 bg-nex-elevated">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Lower Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="nex-card p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            <ListSkeleton count={3} />
          </div>
          <div className="nex-card p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            <ListSkeleton count={3} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <WelcomeCard
        username={profile?.username}
        isManager={isManager}
      />

      {/* 2-column grid for Pinned Notice and Mess Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
          onQuickMealToggle={handleToggleMeal}
        />
      </div>

      <CookSummary data={cookSummary} />

      <MealSelector
        mealsData={mealsData}
        routines={routines}
        mealLoading={mealLoading}
        onToggleMeal={handleToggleMeal}
        onUpdateGuest={handleUpdateGuest}
      />

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        title="Remove Emergency Contact"
        message="Are you sure you want to remove this emergency contact? This action is irreversible."
        confirmText="Remove"
        variant="danger"
        onConfirm={confirmDeleteEC}
        onCancel={() => setDeleteEcId(null)}
      />
    </div>
  )
}
