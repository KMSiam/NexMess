import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import { MarketSchedule } from '../../types/database'
import {
  ShoppingBag, Plus, ChevronLeft, ChevronRight, Trash2,
  Calendar, UserCheck, ArrowRightLeft,
} from 'lucide-react'
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isToday, isBefore,
} from 'date-fns'
import { getInitials } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function MarketPage() {
  const { user } = useAuthStore()
  const { currentMess, members } = useMessStore()
  const [schedules, setSchedules] = useState<MarketSchedule[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')
  const approvedMembers = members.filter(m => m.status === 'approved')

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 6 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 6 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    if (!currentMess?.id) return
    fetchSchedules()

    // Real-time subscription for schedules
    const channel = supabase
      .channel('market-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_schedules', filter: `mess_id=eq.${currentMess.id}` },
        () => fetchSchedules()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMess?.id, format(weekStart, 'yyyy-MM-dd')])

  const fetchSchedules = async () => {
    if (!currentMess?.id) return
    const { data } = await supabase
      .from('market_schedules')
      .select('*, profiles(username, avatar_url)')
      .eq('mess_id', currentMess.id)
      .gte('assigned_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('assigned_date', format(weekEnd, 'yyyy-MM-dd'))
      .order('assigned_date', { ascending: true })

    if (data) setSchedules(data as MarketSchedule[])
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMess?.id || !selectedUser || !selectedDate) return
    setLoading(true)

    const { error } = await supabase.from('market_schedules').insert({
      mess_id: currentMess.id,
      user_id: selectedUser,
      assigned_date: selectedDate,
    })

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Already assigned for this date' : 'Failed to assign')
    } else {
      toast.success('Bazaar duty assigned!')
      setShowAdd(false)
      setSelectedUser('')
      fetchSchedules()
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this assignment?')) return
    await supabase.from('market_schedules').delete().eq('id', id)
    toast.success('Assignment removed')
    fetchSchedules()
  }

  const autoAssign = async () => {
    if (!currentMess?.id || approvedMembers.length === 0) return
    setLoading(true)

    // Round-robin: assign each day of the next week to members
    const nextWeekStart = startOfWeek(addWeeks(currentWeek, 1), { weekStartsOn: 6 })
    const nextWeekDays = eachDayOfInterval({
      start: nextWeekStart,
      end: endOfWeek(addWeeks(currentWeek, 1), { weekStartsOn: 6 }),
    })

    const assignments = nextWeekDays.map((day, i) => ({
      mess_id: currentMess.id,
      user_id: approvedMembers[i % approvedMembers.length].user_id,
      assigned_date: format(day, 'yyyy-MM-dd'),
    }))

    const { error } = await supabase.from('market_schedules').upsert(assignments, {
      onConflict: 'mess_id,user_id,assigned_date',
    })

    if (error) toast.error('Failed to auto-assign')
    else {
      toast.success('Next week auto-assigned!')
      setCurrentWeek(addWeeks(currentWeek, 1))
    }
    setLoading(false)
  }

  if (!currentMess) return null

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-nex-primary" />
          <h1 className="text-2xl font-bold text-nex-text">Bazaar Schedule</h1>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <button onClick={autoAssign} disabled={loading} className="nex-btn-secondary text-xs flex-1 sm:flex-none justify-center" id="auto-assign-btn">
              <ArrowRightLeft className="w-4 h-4" /> Auto Assign
            </button>
            <button onClick={() => setShowAdd(!showAdd)} className="nex-btn-primary text-xs flex-1 sm:flex-none justify-center" id="add-schedule-btn">
              <Plus className="w-4 h-4" /> Assign
            </button>
          </div>
        )}
      </div>

      {/* Add Form */}
      {showAdd && isManager && (
        <div className="nex-card p-5 animate-slide-up">
          <h3 className="text-lg font-semibold text-nex-text mb-4">Assign Bazaar Duty</h3>
          <form onSubmit={handleAssign} className="flex flex-col sm:flex-row gap-3">
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
              className="nex-input flex-1" required id="schedule-member">
              <option value="">Select member</option>
              {approvedMembers.map(m => {
                const p = m.profiles as any
                return <option key={m.user_id} value={m.user_id}>{p?.username || 'Member'}</option>
              })}
            </select>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="nex-input flex-1" required id="schedule-date" />
            <button type="submit" disabled={loading} className="nex-btn-primary whitespace-nowrap disabled:opacity-50">
              Assign
            </button>
          </form>
        </div>
      )}

      {/* Week Navigator */}
      <div className="nex-card p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-btn hover:bg-nex-hover text-nex-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm sm:text-base font-semibold text-nex-text">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-btn hover:bg-nex-hover text-nex-muted transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop: Grid view (hidden on small screens) */}
        <div className="hidden sm:grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const daySchedule = schedules.find(s => s.assigned_date === dateStr)
            const assignee = daySchedule?.profiles as any
            const todayFlag = isToday(day)
            const past = isBefore(day, new Date()) && !todayFlag

            return (
              <div key={dateStr} className={`rounded-xl border p-3 text-center transition-colors ${
                todayFlag ? 'border-nex-primary bg-nex-primary-light' :
                past ? 'border-transparent bg-nex-elevated/50' : 'border-nex-border bg-nex-surface'
              }`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                  todayFlag ? 'text-nex-primary' : 'text-nex-muted'
                }`}>{format(day, 'EEE')}</p>
                <p className={`text-lg font-bold mb-2 ${todayFlag ? 'text-nex-primary' : 'text-nex-text'}`}>{format(day, 'd')}</p>
                {daySchedule ? (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full mx-auto bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {assignee?.avatar_url ? (
                        <img src={assignee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : getInitials(assignee?.username || '?')}
                    </div>
                    <p className="text-xs font-medium text-nex-text truncate">{assignee?.username}</p>
                    {isManager && (
                      <button onClick={() => handleDelete(daySchedule.id)} className="text-nex-muted hover:text-nex-danger transition-colors">
                        <Trash2 className="w-3 h-3 mx-auto" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-2">
                    <Calendar className="w-5 h-5 mx-auto text-nex-muted/40" />
                    <p className="text-[10px] text-nex-muted/40 mt-1">Unassigned</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: Card list view (shown only on small screens) */}
        <div className="sm:hidden space-y-2">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const daySchedule = schedules.find(s => s.assigned_date === dateStr)
            const assignee = daySchedule?.profiles as any
            const todayFlag = isToday(day)
            const past = isBefore(day, new Date()) && !todayFlag

            return (
              <div key={dateStr} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                todayFlag ? 'border-nex-primary bg-nex-primary-light' :
                past ? 'border-transparent bg-nex-elevated/50 opacity-60' : 'border-nex-border bg-nex-surface'
              }`}>
                {/* Date Column */}
                <div className={`w-12 text-center shrink-0 ${todayFlag ? 'text-nex-primary' : 'text-nex-text'}`}>
                  <p className="text-[10px] font-semibold uppercase">{format(day, 'EEE')}</p>
                  <p className="text-lg font-bold leading-tight">{format(day, 'd')}</p>
                </div>

                <div className="w-px h-10 bg-nex-border shrink-0"></div>

                {/* Assignee */}
                {daySchedule ? (
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {assignee?.avatar_url ? (
                        <img src={assignee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : getInitials(assignee?.username || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-nex-text truncate">{assignee?.username}</p>
                      <p className="text-[10px] text-nex-muted">Bazaar Duty</p>
                    </div>
                    {isManager && (
                      <button onClick={() => handleDelete(daySchedule.id)} className="p-1.5 text-nex-muted hover:text-nex-danger transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2 text-nex-muted/40">
                    <Calendar className="w-4 h-4" />
                    <p className="text-xs">Unassigned</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* This Month Overview */}
      <div className="nex-card p-5">
        <h3 className="text-sm font-semibold text-nex-text uppercase tracking-wider mb-3">Duty Count This Month</h3>
        <div className="space-y-2">
          {approvedMembers.map(member => {
            const p = member.profiles as any
            const count = schedules.filter(s => s.user_id === member.user_id).length
            return (
              <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-nex-hover">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-semibold">
                    {getInitials(p?.username || '?')}
                  </div>
                  <span className="text-sm text-nex-text">{p?.username || 'Member'}</span>
                </div>
                <span className="nex-badge-primary text-[10px]">{count} days</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
