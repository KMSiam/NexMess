'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getDashboardDetails } from '@/actions/dashboard'
import { upsertMeal } from '@/actions/meals'
import { cancelJoinRequest } from '@/actions/mess'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import { usePusherRealtime } from '@/hooks/usePusherRealtime'
import { isMealCutoffPassed, dhakaToday, dhakaTomorrow } from '@/lib/utils'
import { sql } from '@/lib/db' // Wait, DB operations go through actions! We will add Server Actions for notice and emergency contacts.

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
import ConfirmDialog from '@/components/ConfirmDialog'
import { CardSkeleton, ListSkeleton, Skeleton } from '@/components/Skeleton'

// Notice and EC Server Actions (we can write them inline or import them)
import { saveNotice, dismissNotice, addEmergencyContact, deleteEmergencyContact } from '@/actions/dashboardHelpers'

export default function DashboardClient({ initialData }: { initialData?: any }) {
  const { profile } = useProfileStore()
  const { currentMess, members, pendingRequests } = useMessStore()

  const [data, setData] = useState<any>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [mealLoading, setMealLoading] = useState(false)
  const [deleteEcId, setDeleteEcId] = useState<string | null>(null)

  const fetchDetails = useCallback(async () => {
    if (!currentMess?.id) return
    try {
      const details = await getDashboardDetails(currentMess.id)
      setData(details)
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [currentMess?.id])

  useEffect(() => {
    // Only fetch if we don't have initialData OR if currentMess.id changed after hydration
    if (currentMess?.id) {
      if (!initialData) {
        fetchDetails()
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMess?.id])

  // Realtime subscription using Pusher
  usePusherRealtime(
    currentMess?.id,
    ['meals', 'notices', 'expenses', 'deposits', 'fixed_costs', 'emergency_contacts', 'market_schedules'],
    fetchDetails
  )

  const isManager = members.some((m) => m.user_id === profile?.id && m.role === 'manager')

  const handleSaveNotice = async (text: string) => {
    if (!currentMess?.id) return
    try {
      await saveNotice(currentMess.id, text, data?.notice?.id)
      toast.success('Notice posted!')
      fetchDetails()
    } catch (err: any) {
      toast.error('Failed to post notice')
    }
  }

  const handleDismissNotice = async () => {
    if (!data?.notice?.id) return
    try {
      await dismissNotice(data.notice.id)
      toast.success('Notice removed')
      fetchDetails()
    } catch (err: any) {
      toast.error('Failed to remove notice')
    }
  }

  const handleAddEC = async (name: string, phone: string) => {
    if (!currentMess?.id) return
    try {
      await addEmergencyContact(currentMess.id, name, phone)
      toast.success('Contact added!')
      fetchDetails()
    } catch (err: any) {
      toast.error('Failed to add contact')
    }
  }

  const confirmDeleteEC = async () => {
    if (!deleteEcId) return
    try {
      await deleteEmergencyContact(deleteEcId)
      toast.success('Contact removed')
      setDeleteEcId(null)
      fetchDetails()
    } catch (err: any) {
      toast.error('Failed to remove contact')
    }
  }

  const handleToggleMeal = async (tab: 'today' | 'tomorrow', type: 'lunch' | 'dinner') => {
    if (!profile?.id || !currentMess?.id || !data) return
    const targetDateStr = tab === 'today' ? dhakaToday() : dhakaTomorrow()

    if (isMealCutoffPassed(targetDateStr, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off has passed`)
      return
    }

    setMealLoading(true)
    const mData = data.myMeals.find((m: any) => m.date === targetDateStr) || {
      lunch: false,
      dinner: false,
      guest_lunch: 0,
      guest_dinner: 0,
    }

    const newLunch = type === 'lunch' ? !mData.lunch : mData.lunch
    const newDinner = type === 'dinner' ? !mData.dinner : mData.dinner

    const res = await upsertMeal(
      currentMess.id,
      targetDateStr,
      newLunch,
      newDinner,
      mData.guest_lunch,
      mData.guest_dinner
    )

    if (!res.success) {
      toast.error(res.error || 'Failed to update meal')
    }
    setMealLoading(false)
    fetchDetails()
  }

  const handleUpdateGuest = async (
    tab: 'today' | 'tomorrow',
    type: 'lunch' | 'dinner',
    delta: number
  ) => {
    if (!profile?.id || !currentMess?.id || !data) return
    const targetDateStr = tab === 'today' ? dhakaToday() : dhakaTomorrow()

    if (isMealCutoffPassed(targetDateStr, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off has passed`)
      return
    }

    setMealLoading(true)
    const mData = data.myMeals.find((m: any) => m.date === targetDateStr) || {
      lunch: false,
      dinner: false,
      guest_lunch: 0,
      guest_dinner: 0,
    }

    const currentGuest = type === 'lunch' ? mData.guest_lunch : mData.guest_dinner
    const newGuest = Math.max(0, currentGuest + delta)

    const res = await upsertMeal(
      currentMess.id,
      targetDateStr,
      mData.lunch,
      mData.dinner,
      type === 'lunch' ? newGuest : mData.guest_lunch,
      type === 'dinner' ? newGuest : mData.guest_dinner
    )

    if (!res.success) {
      toast.error(res.error || 'Failed to update guests')
    }
    setMealLoading(false)
    fetchDetails()
  }

  const handleCancelRequest = async (messId: string) => {
    try {
      await cancelJoinRequest(messId)
      toast.success('Request canceled')
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to cancel request')
    }
  }

  if (!currentMess) {
    return (
      <div className="mx-auto max-w-lg space-y-8 py-12">
        <div className="text-center">
          <div className="bg-nex-primary-light mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <Users className="text-nex-primary h-8 w-8" />
          </div>
          <h2 className="text-nex-text mb-2 text-2xl font-bold">No mess joined yet</h2>
          <p className="text-nex-muted mb-6">
            Create a new mess or join an existing one with a code.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/mess/create" className="nex-btn-primary">
              <Plus className="h-4 w-4" /> Create Mess
            </Link>
            <Link href="/mess/join" className="nex-btn-secondary">
              Join Mess
            </Link>
          </div>
        </div>

        {pendingRequests && pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-nex-muted text-center text-xs font-bold tracking-wider uppercase">
              Pending Requests
            </h3>
            {pendingRequests.map((req) => (
              <div
                key={req.mess_id}
                className="nex-card flex items-center justify-between border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <div>
                  <h4 className="text-nex-text font-semibold">
                    {req.messes?.name || 'Unknown Mess'}
                  </h4>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-500">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                    </span>
                    Waiting for approval
                  </p>
                </div>
                <button
                  onClick={() => handleCancelRequest(req.mess_id)}
                  className="rounded-xl bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-500 transition-all duration-200 hover:bg-red-500 hover:text-white cursor-pointer"
                >
                  Cancel Request
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading || !data) {
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

  // Format local client-side states from combined details structure
  const formattedMeals = {
    today: data.myMeals.find((m: any) => m.date === dhakaToday()) || { lunch: false, dinner: false, gl: 0, gd: 0 },
    tomorrow: data.myMeals.find((m: any) => m.date === dhakaTomorrow()) || { lunch: false, dinner: false, gl: 0, gd: 0 },
  }
  const defaultMeals = {
    today: {
      lunch: formattedMeals.today.lunch,
      dinner: formattedMeals.today.dinner,
      gl: formattedMeals.today.guest_lunch || 0,
      gd: formattedMeals.today.guest_dinner || 0,
    },
    tomorrow: {
      lunch: formattedMeals.tomorrow.lunch,
      dinner: formattedMeals.tomorrow.dinner,
      gl: formattedMeals.tomorrow.guest_lunch || 0,
      gd: formattedMeals.tomorrow.guest_dinner || 0,
    },
  }

  // Format routines for view
  const formattedRoutines = {
    today: {
      lunch: data.routines.find((r: any) => r.day_of_week === ((new Date(dhakaToday() + 'T00:00:00+06:00').getUTCDay() + 1) % 7))?.lunch || '',
      dinner: data.routines.find((r: any) => r.day_of_week === ((new Date(dhakaToday() + 'T00:00:00+06:00').getUTCDay() + 1) % 7))?.dinner || '',
    },
    tomorrow: {
      lunch: data.routines.find((r: any) => r.day_of_week === ((new Date(dhakaTomorrow() + 'T00:00:00+06:00').getUTCDay() + 1) % 7))?.lunch || '',
      dinner: data.routines.find((r: any) => r.day_of_week === ((new Date(dhakaTomorrow() + 'T00:00:00+06:00').getUTCDay() + 1) % 7))?.dinner || '',
    },
  }

  // Cook counts
  const cookCounts = {
    todayL: 0,
    todayD: 0,
    tomorrowL: 0,
    tomorrowD: 0,
  }
  data.allMeals.forEach((m: any) => {
    if (m.date === dhakaToday()) {
      cookCounts.todayL += (m.lunch ? 1 : 0) + (m.guest_lunch || 0)
      cookCounts.todayD += (m.dinner ? 1 : 0) + (m.guest_dinner || 0)
    } else {
      cookCounts.tomorrowL += (m.lunch ? 1 : 0) + (m.guest_lunch || 0)
      cookCounts.tomorrowD += (m.dinner ? 1 : 0) + (m.guest_dinner || 0)
    }
  })

  // Format activities
  const recentActivities = [
    ...data.expenses.map((e: any) => ({
      id: e.id,
      text: `${e.username || 'Someone'} added ${e.category} bazaar cost of ৳${e.amount}`,
      type: 'expense',
      time: e.created_at,
    })),
    ...data.deposits.map((d: any) => ({
      id: d.id,
      text: `${d.username || 'Someone'} deposited ৳${d.amount}`,
      type: 'deposit',
      time: d.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 4)

  return (
    <div className="animate-fade-in mx-auto max-w-5xl space-y-5">
      <WelcomeCard username={profile?.username} isManager={isManager} />

      {/* 2-column grid for Pinned Notice and Mess Alerts */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <NoticeBoard
          notice={data.notice}
          isManager={isManager}
          onSaveNotice={handleSaveNotice}
          onDismissNotice={handleDismissNotice}
        />

        <AlertBanners
          mealsData={defaultMeals}
          stats={data.stats}
          unpaidFixed={data.unpaidFixedCount}
          isBazaarMan={data.isBazaarMan}
          isManager={isManager}
          onQuickMealToggle={handleToggleMeal}
        />
      </div>

      {/* 2-column grid for Cook's Summary and My Meals */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <CookSummary data={cookCounts} />
        <MealSelector
          mealsData={defaultMeals}
          routines={formattedRoutines}
          mealLoading={mealLoading}
          onToggleMeal={handleToggleMeal}
          onUpdateGuest={handleUpdateGuest}
        />
      </div>

      <StatsGrid stats={data.stats} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RecentActivity activities={recentActivities} />
        <BazaarScheduleCard schedule={data.schedules} />
      </div>

      <EmergencyContacts
        contacts={data.contacts}
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
