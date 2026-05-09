import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { format, addDays, isToday, isTomorrow } from 'date-fns'
import {
  Activity, CalendarDays, Plus,
  Megaphone, PhoneCall, Trash2, ShieldAlert,
  Users, Send, X, AlertTriangle, Wallet, ShoppingBag, ChefHat, UtensilsCrossed, Clock,
} from 'lucide-react'
import { getGreeting, formatCurrency, getFoodEmoji, isMealCutoffPassed, mealCutoffLabel, mealCutoffApproaching } from '../../lib/utils'
import { sendPushToUsers } from '../../lib/push'
import toast from 'react-hot-toast'
import { CardSkeleton, ListSkeleton, Skeleton } from '../../components/Skeleton'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { currentMess } = useMessStore()
  
  const [mealTab, setMealTab] = useState<'today' | 'tomorrow'>('today')
  const [mealsData, setMealsData] = useState({
    today: { lunch: false, dinner: false, gl: 0, gd: 0 },
    tomorrow: { lunch: false, dinner: false, gl: 0, gd: 0 }
  })
  const [routines, setRoutines] = useState({
    today: { lunch: '', dinner: '' },
    tomorrow: { lunch: '', dinner: '' }
  })
  const [cookSummary, setCookSummary] = useState({ todayL: 0, todayD: 0, tomorrowL: 0, tomorrowD: 0 })
  const [upcomingBazaar, setUpcomingBazaar] = useState<{date: string, username: string}[]>([])
  const [unpaidFixed, setUnpaidFixed] = useState(0)
  const [recentActs, setRecentActs] = useState<{id: string, text: string, type: string, time: string}[]>([])
  const [stats, setStats] = useState({ totalMeals: 0, balance: 0, mealRate: 0, messTotalSpent: 0 })
  const [isBazaarMan, setIsBazaarMan] = useState(false)
  const [mealLoading, setMealLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [notice, setNotice] = useState<{id: string, message: string} | null>(null)
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [noticeText, setNoticeText] = useState('')
  const [noticeLoading, setNoticeLoading] = useState(false)
  
  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<{id: string, name: string, phone: string}[]>([])
  const [showECForm, setShowECForm] = useState(false)
  const [ecName, setEcName] = useState('')
  const [ecPhone, setEcPhone] = useState('')

  const { members } = useMessStore()
  const isManager = members.some(m => m.user_id === profile?.id && m.role === 'manager')

  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const currentMonth = format(new Date(), 'yyyy-MM')

  // Re-evaluate cut-off banner every 60s without polluting other state
  const [, setNowTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profile?.id || !currentMess?.id) return
    
    const fetchDashboardData = async () => {
      // 1. Personal Meals
      const { data: myMeals } = await supabase.from('meals').select('*').eq('user_id', profile.id).eq('mess_id', currentMess.id).in('date', [today, tomorrow])
      const newMeals = { today: { lunch: false, dinner: false, gl: 0, gd: 0 }, tomorrow: { lunch: false, dinner: false, gl: 0, gd: 0 } }
      myMeals?.forEach(m => {
        const key = m.date === today ? 'today' : 'tomorrow'
        newMeals[key] = { lunch: m.lunch, dinner: m.dinner, gl: m.guest_lunch || 0, gd: m.guest_dinner || 0 }
      })
      setMealsData(newMeals)

      // 2. Cook Summary
      const { data: allMeals } = await supabase.from('meals').select('*').eq('mess_id', currentMess.id).in('date', [today, tomorrow])
      const cook = { todayL: 0, todayD: 0, tomorrowL: 0, tomorrowD: 0 }
      allMeals?.forEach(m => {
        if (m.date === today) {
          cook.todayL += (m.lunch ? 1 : 0) + (m.guest_lunch || 0)
          cook.todayD += (m.dinner ? 1 : 0) + (m.guest_dinner || 0)
        } else {
          cook.tomorrowL += (m.lunch ? 1 : 0) + (m.guest_lunch || 0)
          cook.tomorrowD += (m.dinner ? 1 : 0) + (m.guest_dinner || 0)
        }
      })
      setCookSummary(cook)

      // 3. Upcoming Bazaar
      const { data: marketData } = await supabase.from('market_schedules').select('assigned_date, profiles(username)').eq('mess_id', currentMess.id).gte('assigned_date', today).order('assigned_date', { ascending: true }).limit(3)
      if (marketData) {
        setIsBazaarMan(marketData.some(m => m.assigned_date === today && (m as any).profiles?.username === profile.username))
        setUpcomingBazaar(marketData.map(m => ({ date: m.assigned_date, username: (m as any).profiles?.username || 'Unknown' })))
      }

      // 4. Unpaid Fixed Costs
      const { count } = await supabase.from('fixed_costs').select('*', { count: 'exact', head: true }).eq('mess_id', currentMess.id).eq('is_paid', false)
      setUnpaidFixed(count || 0)

      // 5. Recent Activity
      const { data: expData } = await supabase.from('expenses').select('id, amount, category, created_at, profiles(username)').eq('mess_id', currentMess.id).order('created_at', { ascending: false }).limit(3)
      const { data: depData } = await supabase.from('deposits').select('id, amount, created_at, profiles!deposits_user_id_fkey(username)').eq('mess_id', currentMess.id).order('created_at', { ascending: false }).limit(3)
      
      const acts = [
        ...(expData || []).map(e => ({ id: e.id, text: `${(e as any).profiles?.username} added ${e.category} expense of ৳${e.amount}`, type: 'expense', time: e.created_at })),
        ...(depData || []).map(d => ({ id: d.id, text: `${(d as any).profiles?.username} deposited ৳${d.amount}`, type: 'deposit', time: d.created_at }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4)
      setRecentActs(acts)

      // 6. Balance & Stats
      const { data: balData } = await supabase.rpc('calculate_member_balance', { p_user_id: profile.id, p_mess_id: currentMess.id, p_month: currentMonth })
      if (balData) {
        const b = Array.isArray(balData) ? balData[0] : balData
        if (b) {
          setStats({ totalMeals: b.personal_meals || 0, balance: b.balance || 0, mealRate: b.meal_rate || 0, messTotalSpent: b.total_mess_bazaar || 0 })
        }
      }

      // 7. Active Notice
      const { data: noticeData } = await supabase.from('notices').select('id, message').eq('mess_id', currentMess.id).eq('is_active', true).single()
      if (noticeData) setNotice(noticeData)
      else setNotice(null)

      // 8. Meal Routine
      const todayDow = (new Date(today).getDay() + 1) % 7
      const tomorrowDow = (new Date(tomorrow).getDay() + 1) % 7
      const { data: routineData } = await supabase.from('meal_routines').select('day_of_week, lunch, dinner').eq('mess_id', currentMess.id).in('day_of_week', [todayDow, tomorrowDow])
      if (routineData) {
        const todayR = routineData.find(r => r.day_of_week === todayDow)
        const tomorrowR = routineData.find(r => r.day_of_week === tomorrowDow)
        setRoutines({
          today: { lunch: todayR?.lunch || '', dinner: todayR?.dinner || '' },
          tomorrow: { lunch: tomorrowR?.lunch || '', dinner: tomorrowR?.dinner || '' }
        })
      }

      // 9. Emergency Contacts
      const { data: ecData } = await supabase.from('emergency_contacts').select('id, name, phone').eq('mess_id', currentMess.id).order('created_at', { ascending: true })
      if (ecData) setEmergencyContacts(ecData)
      
      setDataLoaded(true)
    }

    fetchDashboardData()

    // ─────────────────────────────────────────────
    // REALTIME SUBSCRIPTION
    // ─────────────────────────────────────────────
    const channel = supabase
      .channel(`db-changes-${currentMess.id}-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals', filter: `mess_id=eq.${currentMess.id}` },
        () => {
          setTimeout(fetchDashboardData, 300)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notices', filter: `mess_id=eq.${currentMess.id}` },
        () => {
          setTimeout(fetchDashboardData, 300)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `mess_id=eq.${currentMess.id}` },
        () => {
          setTimeout(fetchDashboardData, 300)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits', filter: `mess_id=eq.${currentMess.id}` },
        () => {
          setTimeout(fetchDashboardData, 300)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixed_costs', filter: `mess_id=eq.${currentMess.id}` },
        () => {
          setTimeout(fetchDashboardData, 300)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, profile?.username, currentMess?.id, today, tomorrow, currentMonth])

  const handleSaveNotice = async () => {
    if (!currentMess?.id || !profile?.id || !noticeText.trim()) return
    setNoticeLoading(true)

    // Deactivate any existing notice first
    if (notice) {
      await supabase.from('notices').update({ is_active: false }).eq('id', notice.id)
    }

    const { data, error } = await supabase.from('notices').insert({
      mess_id: currentMess.id, message: noticeText.trim(), created_by: profile.id
    }).select('id, message').single()

    if (error) toast.error('Failed to post notice')
    else {
      toast.success('Notice posted!')
      setNotice(data)
      setShowNoticeForm(false)
      setNoticeText('')
      // Push notification to all mess members (fire-and-forget)
      const memberIds = members
        .filter(m => m.status === 'approved' && m.user_id !== profile.id)
        .map(m => m.user_id)
      sendPushToUsers(memberIds, `📢 ${currentMess.name}`, noticeText.trim(), '/dashboard')
    }
    setNoticeLoading(false)
  }

  const handleDismissNotice = async () => {
    if (!notice) return
    await supabase.from('notices').update({ is_active: false }).eq('id', notice.id)
    setNotice(null)
    toast.success('Notice removed')
  }

  const handleAddEC = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !ecName.trim() || !ecPhone.trim()) return
    
    const { data, error } = await supabase.from('emergency_contacts').insert({
      mess_id: currentMess.id, name: ecName.trim(), phone: ecPhone.trim()
    }).select('id, name, phone').single()

    if (error) toast.error('Failed to add contact')
    else {
      toast.success('Contact added!')
      setEmergencyContacts(prev => [...prev, data])
      setShowECForm(false)
      setEcName('')
      setEcPhone('')
    }
  }

  const handleDeleteEC = async (id: string) => {
    if (!confirm('Remove this contact?')) return
    await supabase.from('emergency_contacts').delete().eq('id', id)
    setEmergencyContacts(prev => prev.filter(ec => ec.id !== id))
    toast.success('Contact removed')
  }

  const toggleMeal = async (type: 'lunch' | 'dinner') => {
    if (!profile?.id || !currentMess?.id) return
    const targetDate = mealTab === 'today' ? today : tomorrow

    if (isMealCutoffPassed(targetDate, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off (${mealCutoffLabel(type)}) has passed`)
      return
    }

    setMealLoading(true)
    const mData = mealsData[mealTab]
    const newValue = type === 'lunch' ? !mData.lunch : !mData.dinner

    setMealsData(prev => ({ ...prev, [mealTab]: { ...prev[mealTab], [type]: newValue } }))

    // Only include the toggled column — DO UPDATE SET touches only it, so the other
    // meal column stays identical (OLD = NEW) and the trigger's lunch_changed / dinner_changed
    // stays false. Including the other column caused false "cut-off has passed" raises when
    // local state was stale vs the DB value.
    const { error } = await supabase.from('meals').upsert({
      user_id: profile.id, mess_id: currentMess.id, date: targetDate,
      [type]: newValue,
    }, { onConflict: 'user_id,mess_id,date' })

    if (error) {
      toast.error(error.message || 'Failed to update meal')
      setMealsData(prev => ({ ...prev, [mealTab]: { ...prev[mealTab], [type]: !newValue } }))
    }
    setMealLoading(false)
  }

  const updateGuest = async (type: 'lunch' | 'dinner', delta: number) => {
    if (!profile?.id || !currentMess?.id) return
    const targetDate = mealTab === 'today' ? today : tomorrow

    if (isMealCutoffPassed(targetDate, type)) {
      toast.error(`${type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off (${mealCutoffLabel(type)}) has passed`)
      return
    }

    setMealLoading(true)
    const mData = mealsData[mealTab]
    const key = type === 'lunch' ? 'gl' : 'gd'
    const newVal = Math.max(0, mData[key] + delta)

    setMealsData(prev => ({ ...prev, [mealTab]: { ...prev[mealTab], [key]: newVal } }))

    // Only include the toggled guest column — same reason as toggleMeal: stale React
    // state for the other columns would otherwise make the trigger see false changes
    // and raise the wrong cutoff.
    const guestCol = type === 'lunch' ? 'guest_lunch' : 'guest_dinner'
    const { error } = await supabase.from('meals').upsert({
      user_id: profile.id, mess_id: currentMess.id, date: targetDate,
      [guestCol]: newVal,
    }, { onConflict: 'user_id,mess_id,date' })

    if (error) {
      toast.error(error.message || 'Failed to update guests')
      setMealsData(prev => ({ ...prev, [mealTab]: { ...prev[mealTab], [key]: mData[key] } }))
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

  const currentMData = mealsData[mealTab]

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      {/* Welcome */}
      <div className="nex-card p-5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-nex-text">{getGreeting()}, {profile?.username} 👋</h3>
          <p className="mt-0.5 text-sm text-nex-muted">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        {isManager && (
          <button onClick={() => { setShowNoticeForm(!showNoticeForm); setNoticeText(notice?.message || '') }} className="p-2 rounded-btn text-nex-muted hover:bg-nex-hover transition-colors" title="Post a notice">
            <Megaphone className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Manager Notice Form */}
      {showNoticeForm && isManager && (
        <div className="nex-card p-4 animate-slide-up border-l-4 border-nex-primary">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-nex-primary" />
            <p className="text-sm font-semibold text-nex-text">Post a Notice</p>
          </div>
          <div className="flex gap-2">
            <input type="text" value={noticeText} onChange={e => setNoticeText(e.target.value)} className="nex-input flex-1 text-base" placeholder="e.g., No dinner tomorrow, deposit ৳2000 by Friday..." maxLength={200} />
            <button onClick={handleSaveNotice} disabled={noticeLoading || !noticeText.trim()} className="nex-btn-primary px-3 disabled:opacity-50"><Send className="w-4 h-4" /></button>
            <button onClick={() => setShowNoticeForm(false)} className="nex-btn-secondary px-3"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Pinned Notice */}
      {notice && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-md flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-white/80 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-white font-medium leading-relaxed">{notice.message}</p>
          {isManager && (
            <button onClick={handleDismissNotice} className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/60 hover:text-white shrink-0" title="Remove notice">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Warnings & Alerts */}
      <div className="space-y-3">
        {(() => {
          // Cut-off reminder: only for *today* and only when the meal isn't already on
          const lunchLeft = !mealsData.today.lunch ? mealCutoffApproaching('lunch') : null
          const dinnerLeft = !mealsData.today.dinner ? mealCutoffApproaching('dinner') : null
          const banners: { type: 'lunch' | 'dinner'; minutes: number }[] = []
          if (lunchLeft !== null) banners.push({ type: 'lunch', minutes: lunchLeft })
          if (dinnerLeft !== null) banners.push({ type: 'dinner', minutes: dinnerLeft })
          return banners.map(b => (
            <div key={b.type} className="nex-card p-4 border-l-4 border-amber-500 bg-amber-500/5 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {b.type === 'lunch' ? 'Lunch' : 'Dinner'} cut-off in {b.minutes} min
                </p>
                <p className="text-xs text-nex-muted mt-0.5">
                  Set today's {b.type} before {mealCutoffLabel(b.type)} or the manager will need to override it.
                </p>
              </div>
              <button
                onClick={() => { setMealTab('today'); toggleMeal(b.type) }}
                className="nex-btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
              >
                Mark on
              </button>
            </div>
          ))
        })()}
        {stats.balance < 0 && (
          <div className="nex-card p-4 border-l-4 border-red-500 bg-red-500/5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-500">Low Balance Alert</p>
              <p className="text-xs text-nex-muted mt-0.5">Your balance is negative ({formatCurrency(stats.balance)}). Please deposit money.</p>
            </div>
          </div>
        )}
        {unpaidFixed > 0 && (
          <div className="nex-card p-4 border-l-4 border-orange-400 bg-orange-500/5 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-500">Unpaid Fixed Costs</p>
              <p className="text-xs text-nex-muted mt-0.5">The mess has {unpaidFixed} unpaid fixed costs this month.</p>
            </div>
          </div>
        )}
        {isBazaarMan && (
          <div className="nex-card p-4 border-l-4 border-emerald-400 bg-emerald-500/5 flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-500">🛒 You're the Bazaar Man today!</p>
              <p className="text-xs text-nex-muted mt-0.5">Don't forget to log your expenses after shopping.</p>
            </div>
          </div>
        )}
      </div>

      {/* Cook's Summary Panel */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 shadow-lg border border-blue-500/20 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <ChefHat className="w-5 h-5 text-blue-100 dark:text-emerald-400" />
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Cook's Summary (Entire Mess)</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 dark:bg-white/5 rounded-xl p-3 border border-white/10 dark:border-white/5">
            <p className="text-xs text-blue-100 dark:text-slate-400 mb-2 font-medium">Today</p>
            <div className="flex justify-between items-center">
              <div className="text-center"><p className="text-lg font-bold text-white dark:text-amber-400">{cookSummary.todayL}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Lunch</p></div>
              <div className="w-px h-8 bg-white/20 dark:bg-white/10"></div>
              <div className="text-center"><p className="text-lg font-bold text-white dark:text-indigo-400">{cookSummary.todayD}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Dinner</p></div>
            </div>
          </div>
          <div className="bg-white/10 dark:bg-white/5 rounded-xl p-3 border border-white/10 dark:border-white/5">
            <p className="text-xs text-blue-100 dark:text-slate-400 mb-2 font-medium">Tomorrow</p>
            <div className="flex justify-between items-center">
              <div className="text-center"><p className="text-lg font-bold text-white dark:text-amber-400">{cookSummary.tomorrowL}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Lunch</p></div>
              <div className="w-px h-8 bg-white/20 dark:bg-white/10"></div>
              <div className="text-center"><p className="text-lg font-bold text-white dark:text-indigo-400">{cookSummary.tomorrowD}</p><p className="text-xs text-blue-100 dark:text-slate-400 uppercase">Dinner</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* My Meals Selection */}
      <div className="nex-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">My Meals</h4>
            {routines[mealTab].lunch || routines[mealTab].dinner ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                <UtensilsCrossed className="w-3 h-3 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">
                  {mealTab === 'today' ? 'Today' : 'Tomorrow'}: {routines[mealTab].lunch ? `${getFoodEmoji(routines[mealTab].lunch)} ${routines[mealTab].lunch} (L)` : ''}
                  {routines[mealTab].lunch && routines[mealTab].dinner ? ' · ' : ''}
                  {routines[mealTab].dinner ? `${getFoodEmoji(routines[mealTab].dinner)} ${routines[mealTab].dinner} (D)` : ''}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex gap-1 bg-nex-elevated p-1 rounded-btn self-start sm:self-auto">
            <button onClick={() => setMealTab('today')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mealTab === 'today' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'}`}>Today</button>
            <button onClick={() => setMealTab('tomorrow')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mealTab === 'tomorrow' ? 'bg-nex-surface text-nex-text shadow-sm' : 'text-nex-muted'}`}>Tomorrow</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { type: 'lunch' as const, emoji: '☀️', on: currentMData.lunch, label: 'Lunch', guests: currentMData.gl },
            { type: 'dinner' as const, emoji: '🌙', on: currentMData.dinner, label: 'Dinner', guests: currentMData.gd },
          ].map(({ type, emoji, on, label, guests }) => {
            const targetDate = mealTab === 'today' ? today : tomorrow
            const locked = isMealCutoffPassed(targetDate, type)
            const lockTitle = locked ? `${label} cut-off (${mealCutoffLabel(type)}) has passed` : ''
            return (
            <div key={type} className={`flex flex-col p-4 rounded-xl border transition-colors duration-200 ${on || guests > 0 ? 'bg-nex-success-light border-emerald-200' : 'bg-nex-elevated border-nex-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-nex-text">{label}</p>
                    <p className={`text-xs font-medium ${locked ? 'text-nex-muted' : on ? 'text-emerald-600' : 'text-nex-muted'}`}>
                      {locked ? `Locked · ${mealCutoffLabel(type)}` : on ? 'Eating' : 'Skipping'}
                    </p>
                  </div>
                </div>
                <button onClick={() => toggleMeal(type)} disabled={mealLoading || locked} title={lockTitle} className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${on ? 'nex-toggle-on' : 'nex-toggle-off'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-emerald-100/50">
                <p className="text-xs font-medium text-slate-500">Guests</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateGuest(type, -1)} disabled={mealLoading || locked || guests === 0} title={lockTitle} className="w-6 h-6 rounded-md bg-nex-surface border border-nex-border flex items-center justify-center text-nex-muted hover:bg-nex-hover disabled:opacity-50">-</button>
                  <span className="text-sm font-semibold w-4 text-center">{guests}</span>
                  <button onClick={() => updateGuest(type, 1)} disabled={mealLoading || locked} title={lockTitle} className="w-6 h-6 rounded-md bg-nex-surface border border-nex-border flex items-center justify-center text-nex-muted hover:bg-nex-hover disabled:opacity-50">+</button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="nex-card p-4 text-center">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">My Meals</p>
          <p className="mt-1 text-xl font-bold text-nex-text">{stats.totalMeals}</p>
        </div>
        <div className="nex-card p-4 text-center">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Balance</p>
          <p className={`mt-1 text-xl font-bold ${stats.balance >= 0 ? 'text-nex-success' : 'text-red-500'}`}>{formatCurrency(stats.balance)}</p>
        </div>
        <div className="nex-card p-4 text-center">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Meal Rate</p>
          <p className="mt-1 text-xl font-bold text-nex-text">{formatCurrency(stats.mealRate)}</p>
        </div>
        <div className="nex-card p-4 text-center">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Mess Spent</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{formatCurrency(stats.messTotalSpent)}</p>
        </div>
      </div>

      {/* Lower Section: Activity & Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="nex-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-nex-primary" />
            <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">Recent Activity</h4>
          </div>
          <div className="space-y-3">
            {recentActs.length === 0 ? (
              <p className="text-xs text-nex-muted text-center py-4">No recent activity.</p>
            ) : recentActs.map(act => (
              <div key={act.id} className="flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${act.type === 'deposit' ? 'bg-nex-success' : 'bg-amber-500'}`} />
                <div>
                  <p className="text-sm text-nex-text">{act.text}</p>
                  <p className="text-[10px] text-nex-muted">{format(new Date(act.time), 'MMM d, h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Bazaar */}
        <div className="nex-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-nex-primary" />
            <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">Upcoming Bazaar</h4>
          </div>
          <div className="space-y-3 divide-y divide-nex-border">
            {upcomingBazaar.length === 0 ? (
              <p className="text-xs text-nex-muted text-center py-4">No schedule set.</p>
            ) : upcomingBazaar.map((ub, idx) => (
              <div key={idx} className="flex items-center justify-between pt-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isToday(new Date(ub.date)) ? 'bg-nex-success-light text-nex-success' : 'bg-nex-elevated text-nex-muted'}`}>
                    {isToday(new Date(ub.date)) ? 'Tdy' : isTomorrow(new Date(ub.date)) ? 'Tmr' : format(new Date(ub.date), 'dd')}
                  </div>
                  <p className="text-sm font-medium text-nex-text">{ub.username}</p>
                </div>
                <p className="text-xs text-nex-muted">{format(new Date(ub.date), 'MMM d')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Contacts Footer */}
      <div className="nex-card p-5 border-t-4 border-red-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider">Emergency Contacts</h4>
          </div>
          {isManager && (
            <button onClick={() => setShowECForm(!showECForm)} className="nex-btn-secondary text-xs py-1 px-2">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          )}
        </div>

        {showECForm && isManager && (
          <form onSubmit={handleAddEC} className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-nex-danger-light rounded-xl border border-nex-danger/10">
            <input type="text" placeholder="Name (e.g., Manager, House Owner)" value={ecName} onChange={e => setEcName(e.target.value)} required className="nex-input flex-1 text-sm py-1.5" />
            <input type="tel" placeholder="Phone Number" value={ecPhone} onChange={e => setEcPhone(e.target.value)} required className="nex-input flex-1 text-sm py-1.5" />
            <button type="submit" className="nex-btn-primary py-1.5 px-4 text-sm whitespace-nowrap">Save</button>
          </form>
        )}

        {emergencyContacts.length === 0 ? (
          <p className="text-xs text-nex-muted">No emergency contacts added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {emergencyContacts.map(ec => (
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
                  <button onClick={() => handleDeleteEC(ec.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
