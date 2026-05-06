import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  LayoutDashboard, ShoppingBag, Utensils, Wallet,
  MessageSquare, Users, ArrowRight, Plus, TrendingUp,
} from 'lucide-react'
import { getGreeting, formatCurrency } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const navigate = useNavigate()
  const [lunchOn, setLunchOn] = useState(false)
  const [dinnerOn, setDinnerOn] = useState(false)
  const [mealLoading, setMealLoading] = useState(false)
  const [stats, setStats] = useState({ totalMeals: 0, balance: 0, mealRate: 0, deposits: 0 })
  const [isBazaarMan, setIsBazaarMan] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentMonth = format(new Date(), 'yyyy-MM')

  // Fetch today's meal status
  useEffect(() => {
    if (!profile?.id || !currentMess?.id) return
    
    const fetchMeal = async () => {
      const { data } = await supabase
        .from('meals')
        .select('lunch, dinner')
        .eq('user_id', profile.id)
        .eq('mess_id', currentMess.id)
        .eq('date', today)
        .single()

      if (data) {
        setLunchOn(data.lunch)
        setDinnerOn(data.dinner)
      }
    }
    fetchMeal()

    // Check bazaar man
    const checkBazaar = async () => {
      const { data } = await supabase
        .from('market_schedules')
        .select('id')
        .eq('mess_id', currentMess.id)
        .eq('user_id', profile.id)
        .eq('assigned_date', today)
        .single()
      setIsBazaarMan(!!data)
    }
    checkBazaar()

    // Fetch balance
    const fetchBalance = async () => {
      const { data } = await supabase.rpc('calculate_member_balance', {
        p_user_id: profile.id,
        p_mess_id: currentMess.id,
        p_month: currentMonth,
      })
      if (data) {
        setStats({
          totalMeals: data.personal_meals || 0,
          balance: data.balance || 0,
          mealRate: data.meal_rate || 0,
          deposits: data.total_deposits || 0,
        })
      }
    }
    fetchBalance()

    // Real-time meal subscription
    const channel = supabase
      .channel('meals-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meals',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        if (payload.new && (payload.new as any).date === today) {
          setLunchOn((payload.new as any).lunch)
          setDinnerOn((payload.new as any).dinner)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, currentMess?.id])

  const toggleMeal = async (type: 'lunch' | 'dinner') => {
    if (!profile?.id || !currentMess?.id) return
    setMealLoading(true)

    const newValue = type === 'lunch' ? !lunchOn : !dinnerOn
    if (type === 'lunch') setLunchOn(newValue)
    else setDinnerOn(newValue)

    const { error } = await supabase
      .from('meals')
      .upsert({
        user_id: profile.id,
        mess_id: currentMess.id,
        date: today,
        lunch: type === 'lunch' ? newValue : lunchOn,
        dinner: type === 'dinner' ? newValue : dinnerOn,
      }, { onConflict: 'user_id,mess_id,date' })

    if (error) {
      toast.error('Failed to update meal')
      if (type === 'lunch') setLunchOn(!newValue)
      else setDinnerOn(!newValue)
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

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      {/* Welcome */}
      <div className="nex-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-nex-text">{getGreeting()}, {profile?.username} 👋</h3>
            <p className="mt-0.5 text-sm text-nex-muted">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <span className="nex-badge-primary hidden sm:flex">
            <LayoutDashboard className="w-3.5 h-3.5" />
            {currentMess.unique_code}
          </span>
        </div>
      </div>

      {/* Bazaar Alert */}
      {isBazaarMan && (
        <div className="nex-card p-4 border-l-4 border-amber-400 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">🛒 You're the Bazaar Man today!</p>
              <p className="text-xs text-amber-600 mt-0.5">Don't forget to log your expenses after shopping.</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Meals */}
      <div className="nex-card p-5">
        <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider mb-4">Today's Meals</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { type: 'lunch' as const, emoji: '☀️', on: lunchOn, label: 'Lunch' },
            { type: 'dinner' as const, emoji: '🌙', on: dinnerOn, label: 'Dinner' },
          ].map(({ type, emoji, on, label }) => (
            <div key={type} className={`flex items-center justify-between p-4 rounded-xl border transition-colors duration-200 ${
              on ? 'bg-nex-success-light border-emerald-200' : 'bg-slate-50 border-nex-border'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{emoji}</span>
                <div>
                  <p className="text-sm font-medium text-nex-text">{label}</p>
                  <p className={`text-xs font-medium ${on ? 'text-emerald-600' : 'text-nex-muted'}`}>
                    {on ? 'Eating today' : 'Skipping'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleMeal(type)}
                disabled={mealLoading}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                  on ? 'nex-toggle-on' : 'nex-toggle-off'
                }`}
                id={`${type}-toggle`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  on ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nex-card p-5">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">This Month's Meals</p>
          <p className="mt-2 text-2xl font-bold text-nex-text">{stats.totalMeals}</p>
        </div>
        <div className="nex-card p-5">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Current Balance</p>
          <p className={`mt-2 text-2xl font-bold ${stats.balance >= 0 ? 'text-nex-success' : 'text-nex-danger'}`}>
            {formatCurrency(stats.balance)}
          </p>
        </div>
        <div className="nex-card p-5">
          <p className="text-xs font-medium text-nex-muted uppercase tracking-wider">Meal Rate</p>
          <p className="mt-2 text-2xl font-bold text-nex-text">{formatCurrency(stats.mealRate)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="nex-card p-5">
        <h4 className="text-sm font-semibold text-nex-text uppercase tracking-wider mb-4">Quick Actions</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/finance" className="nex-btn-primary text-xs py-3 justify-center"><Wallet className="w-4 h-4" />Add Expense</Link>
          <Link to="/settings" className="nex-btn-secondary text-xs py-3 justify-center"><Users className="w-4 h-4" />Members</Link>
          <Link to="/chat" className="nex-btn-secondary text-xs py-3 justify-center"><MessageSquare className="w-4 h-4" />Chat</Link>
          <Link to="/market" className="nex-btn-secondary text-xs py-3 justify-center"><ShoppingBag className="w-4 h-4" />Schedule</Link>
        </div>
      </div>
    </div>
  )
}
