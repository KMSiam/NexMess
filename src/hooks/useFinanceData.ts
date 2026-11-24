import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Expense, Deposit, FixedCost } from '../types/database'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useRealtimeTable } from './useRealtimeTable'

interface UseFinanceDataReturn {
  expenses: Expense[]
  deposits: Deposit[]
  fixedCosts: FixedCost[]
  balances: Record<string, Record<string, unknown>>
  loading: boolean
  refetch: () => void
  currentMonth: string
}

export function useFinanceData(
  messId: string | undefined,
  membersList: { user_id: string; status: string; left_at?: string | null }[]
): UseFinanceDataReturn {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [balances, setBalances] = useState<Record<string, Record<string, unknown>>>({})
  const [loading, setLoading] = useState(true)

  const currentMonth = format(new Date(), 'yyyy-MM')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const financeMembers = membersList.filter((m) => {
    if (m.status === 'approved') return true
    if (m.status === 'left') {
      if (!m.left_at) return true
      return new Date(m.left_at) >= startOfMonth(new Date())
    }
    return false
  })
  const financeMemberIdsStr = JSON.stringify(financeMembers.map((m) => m.user_id))

  const fetchBalances = useCallback(async () => {
    if (!messId) return
    // Batch all balance RPCs with Promise.all (still per-member until
    // a consolidated RPC is created, but at least they run in parallel)
    const settled = await Promise.all(
      financeMembers.map(async (member) => {
        const { data } = await supabase.rpc('calculate_member_balance', {
          p_user_id: member.user_id,
          p_mess_id: messId,
          p_month: currentMonth,
        })
        const row = Array.isArray(data) ? data[0] : data
        return [member.user_id, row] as const
      })
    )
    const results: Record<string, Record<string, unknown>> = {}
    for (const [uid, row] of settled) {
      if (row) results[uid] = row as Record<string, unknown>
    }
    setBalances(results)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messId, currentMonth, financeMemberIdsStr])

  const fetchAllData = useCallback(async () => {
    if (!messId) return
    const [expRes, depRes, fixRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, profiles(username)')
        .eq('mess_id', messId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false })
        .limit(100),
      supabase
        .from('deposits')
        .select('*, profiles!deposits_user_id_fkey(username)')
        .eq('mess_id', messId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false })
        .limit(100),
      supabase.from('fixed_costs').select('*').eq('mess_id', messId).eq('month', currentMonth),
    ])
    if (expRes.data) setExpenses(expRes.data as Expense[])
    if (depRes.data) setDeposits(depRes.data as Deposit[])
    if (fixRes.data) setFixedCosts(fixRes.data as FixedCost[])
    await fetchBalances()
  }, [messId, monthStart, monthEnd, currentMonth, fetchBalances])

  useEffect(() => {
    if (!messId) return
    setLoading(true)
    fetchAllData().finally(() => setLoading(false))
  }, [messId, fetchAllData])

  // Realtime
  useRealtimeTable(
    [
      { table: 'expenses', filter: `mess_id=eq.${messId}` },
      { table: 'deposits', filter: `mess_id=eq.${messId}` },
      { table: 'fixed_costs', filter: `mess_id=eq.${messId}` },
      { table: 'meals', filter: `mess_id=eq.${messId}` },
    ],
    fetchAllData
  )

  return {
    expenses,
    deposits,
    fixedCosts,
    balances,
    loading,
    refetch: fetchAllData,
    currentMonth,
  }
}
