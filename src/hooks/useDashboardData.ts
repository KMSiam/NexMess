import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { dhakaToday, dhakaTomorrow } from '../lib/utils'
import { useRealtimeTable } from './useRealtimeTable'

export interface DashboardMeals {
  today: { lunch: boolean; dinner: boolean; gl: number; gd: number }
  tomorrow: { lunch: boolean; dinner: boolean; gl: number; gd: number }
}

export interface DashboardRoutines {
  today: { lunch: string; dinner: string }
  tomorrow: { lunch: string; dinner: string }
}

export interface CookSummary {
  todayL: number; todayD: number; tomorrowL: number; tomorrowD: number
}

export interface DashboardStats {
  totalMeals: number; balance: number; mealRate: number; messTotalSpent: number
}

export interface DashboardActivity {
  id: string; text: string; type: string; time: string
}

export interface EmergencyContact {
  id: string; name: string; phone: string
}

export interface DashboardNotice {
  id: string; message: string
}

interface UseDashboardDataReturn {
  mealsData: DashboardMeals
  routines: DashboardRoutines
  cookSummary: CookSummary
  upcomingBazaar: { date: string; username: string }[]
  unpaidFixed: number
  recentActs: DashboardActivity[]
  stats: DashboardStats
  isBazaarMan: boolean
  notice: DashboardNotice | null
  emergencyContacts: EmergencyContact[]
  dataLoaded: boolean
  refetch: () => void
  // Meal mutations
  setMealsData: React.Dispatch<React.SetStateAction<DashboardMeals>>
  setNotice: React.Dispatch<React.SetStateAction<DashboardNotice | null>>
  setEmergencyContacts: React.Dispatch<React.SetStateAction<EmergencyContact[]>>
}

const defaultMeals: DashboardMeals = {
  today: { lunch: false, dinner: false, gl: 0, gd: 0 },
  tomorrow: { lunch: false, dinner: false, gl: 0, gd: 0 },
}

export function useDashboardData(
  userId: string | undefined,
  username: string | undefined,
  messId: string | undefined,
): UseDashboardDataReturn {
  const [mealsData, setMealsData] = useState<DashboardMeals>(defaultMeals)
  const [routines, setRoutines] = useState<DashboardRoutines>({
    today: { lunch: '', dinner: '' },
    tomorrow: { lunch: '', dinner: '' },
  })
  const [cookSummary, setCookSummary] = useState<CookSummary>({ todayL: 0, todayD: 0, tomorrowL: 0, tomorrowD: 0 })
  const [upcomingBazaar, setUpcomingBazaar] = useState<{ date: string; username: string }[]>([])
  const [unpaidFixed, setUnpaidFixed] = useState(0)
  const [recentActs, setRecentActs] = useState<DashboardActivity[]>([])
  const [stats, setStats] = useState<DashboardStats>({ totalMeals: 0, balance: 0, mealRate: 0, messTotalSpent: 0 })
  const [isBazaarMan, setIsBazaarMan] = useState(false)
  const [notice, setNotice] = useState<DashboardNotice | null>(null)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  const today = dhakaToday()
  const tomorrow = dhakaTomorrow()
  const currentMonth = today.slice(0, 7)

  const fetchDashboardData = useCallback(async () => {
    if (!userId || !messId) return

    // Batch all independent queries with Promise.all instead of sequential awaits
    const [
      myMealsRes,
      allMealsRes,
      marketRes,
      fixedRes,
      expRes,
      depRes,
      balRes,
      noticeRes,
      routineRes,
      ecRes,
    ] = await Promise.all([
      // 1. Personal Meals
      supabase.from('meals').select('*').eq('user_id', userId).eq('mess_id', messId).in('date', [today, tomorrow]),
      // 2. All Meals (cook summary)
      supabase.from('meals').select('*').eq('mess_id', messId).in('date', [today, tomorrow]),
      // 3. Upcoming Bazaar
      supabase.from('market_schedules').select('assigned_date, profiles(username)').eq('mess_id', messId).gte('assigned_date', today).order('assigned_date', { ascending: true }).limit(3),
      // 4. Unpaid Fixed Costs
      supabase.from('fixed_costs').select('*', { count: 'exact', head: true }).eq('mess_id', messId).eq('is_paid', false),
      // 5. Recent Expenses
      supabase.from('expenses').select('id, amount, category, created_at, profiles(username)').eq('mess_id', messId).order('created_at', { ascending: false }).limit(3),
      // 6. Recent Deposits
      supabase.from('deposits').select('id, amount, created_at, profiles!deposits_user_id_fkey(username)').eq('mess_id', messId).order('created_at', { ascending: false }).limit(3),
      // 7. Balance & Stats
      supabase.rpc('calculate_member_balance', { p_user_id: userId, p_mess_id: messId, p_month: currentMonth }),
      // 8. Active Notice
      supabase.from('notices').select('id, message').eq('mess_id', messId).eq('is_active', true).single(),
      // 9. Meal Routine
      (() => {
        const _dhakaBase = new Date(dhakaToday() + 'T00:00:00+06:00')
        const todayDow = (_dhakaBase.getUTCDay() + 1) % 7
        const _dhakaTomorrow = new Date(_dhakaBase.getTime() + 24 * 60 * 60 * 1000)
        const tomorrowDow = (_dhakaTomorrow.getUTCDay() + 1) % 7
        return supabase.from('meal_routines').select('day_of_week, lunch, dinner').eq('mess_id', messId).in('day_of_week', [todayDow, tomorrowDow])
      })(),
      // 10. Emergency Contacts
      supabase.from('emergency_contacts').select('id, name, phone').eq('mess_id', messId).order('created_at', { ascending: true }),
    ])

    // Process Personal Meals
    const newMeals = { ...defaultMeals }
    myMealsRes.data?.forEach((m: Record<string, unknown>) => {
      const key = m.date === today ? 'today' : 'tomorrow'
      newMeals[key] = {
        lunch: m.lunch as boolean,
        dinner: m.dinner as boolean,
        gl: (m.guest_lunch as number) || 0,
        gd: (m.guest_dinner as number) || 0,
      }
    })
    setMealsData(newMeals)

    // Process Cook Summary
    const cook = { todayL: 0, todayD: 0, tomorrowL: 0, tomorrowD: 0 }
    allMealsRes.data?.forEach((m: Record<string, unknown>) => {
      if (m.date === today) {
        cook.todayL += (m.lunch ? 1 : 0) + ((m.guest_lunch as number) || 0)
        cook.todayD += (m.dinner ? 1 : 0) + ((m.guest_dinner as number) || 0)
      } else {
        cook.tomorrowL += (m.lunch ? 1 : 0) + ((m.guest_lunch as number) || 0)
        cook.tomorrowD += (m.dinner ? 1 : 0) + ((m.guest_dinner as number) || 0)
      }
    })
    setCookSummary(cook)

    // Process Market
    if (marketRes.data) {
      setIsBazaarMan(marketRes.data.some((m: Record<string, unknown>) =>
        m.assigned_date === today && (m.profiles as Record<string, unknown>)?.username === username
      ))
      setUpcomingBazaar(marketRes.data.map((m: Record<string, unknown>) => ({
        date: m.assigned_date as string,
        username: ((m.profiles as Record<string, unknown>)?.username as string) || 'Unknown',
      })))
    }

    // Unpaid Fixed Costs
    setUnpaidFixed(fixedRes.count || 0)

    // Recent Activity
    const acts = [
      ...(expRes.data || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        text: `${(e.profiles as Record<string, unknown>)?.username} added ${e.category} expense of ৳${e.amount}`,
        type: 'expense',
        time: e.created_at as string,
      })),
      ...(depRes.data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        text: `${(d.profiles as Record<string, unknown>)?.username} deposited ৳${d.amount}`,
        type: 'deposit',
        time: d.created_at as string,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4)
    setRecentActs(acts)

    // Balance & Stats
    if (balRes.data) {
      const b = Array.isArray(balRes.data) ? balRes.data[0] : balRes.data
      if (b) {
        setStats({
          totalMeals: b.personal_meals || 0,
          balance: b.balance || 0,
          mealRate: b.meal_rate || 0,
          messTotalSpent: b.total_mess_bazaar || 0,
        })
      }
    }

    // Notice
    if (noticeRes.data) setNotice(noticeRes.data)
    else setNotice(null)

    // Meal Routine
    if (routineRes.data) {
      const _dhakaBase = new Date(dhakaToday() + 'T00:00:00+06:00')
      const todayDow = (_dhakaBase.getUTCDay() + 1) % 7
      const _dhakaTomorrow = new Date(_dhakaBase.getTime() + 24 * 60 * 60 * 1000)
      const tomorrowDow = (_dhakaTomorrow.getUTCDay() + 1) % 7
      const todayR = routineRes.data.find((r: Record<string, unknown>) => r.day_of_week === todayDow)
      const tomorrowR = routineRes.data.find((r: Record<string, unknown>) => r.day_of_week === tomorrowDow)
      setRoutines({
        today: { lunch: (todayR?.lunch as string) || '', dinner: (todayR?.dinner as string) || '' },
        tomorrow: { lunch: (tomorrowR?.lunch as string) || '', dinner: (tomorrowR?.dinner as string) || '' },
      })
    }

    // Emergency Contacts
    if (ecRes.data) setEmergencyContacts(ecRes.data)

    setDataLoaded(true)
  }, [userId, username, messId, today, tomorrow, currentMonth])

  useEffect(() => {
    if (!userId || !messId) return
    fetchDashboardData()
  }, [userId, messId, fetchDashboardData])

  // Realtime subscriptions
  useRealtimeTable(
    [
      { table: 'meals', filter: `mess_id=eq.${messId}` },
      { table: 'notices', filter: `mess_id=eq.${messId}` },
      { table: 'expenses', filter: `mess_id=eq.${messId}` },
      { table: 'deposits', filter: `mess_id=eq.${messId}` },
      { table: 'fixed_costs', filter: `mess_id=eq.${messId}` },
    ],
    fetchDashboardData,
    undefined,
    500, // debounce 500ms
  )

  return {
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
    refetch: fetchDashboardData,
    setMealsData,
    setNotice,
    setEmergencyContacts,
  }
}
