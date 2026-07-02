import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Generic hook for subscribing to Supabase Realtime postgres_changes.
 *
 * Handles channel creation, subscription, and cleanup automatically.
 * Debounces callbacks by default (300ms) to avoid excessive re-fetches.
 *
 * Usage:
 *   useRealtimeTable('meals', `mess_id=eq.${messId}`, fetchMeals)
 *   useRealtimeTable([
 *     { table: 'expenses', filter: `mess_id=eq.${messId}` },
 *     { table: 'deposits', filter: `mess_id=eq.${messId}` },
 *   ], fetchAll)
 */

interface TableSubscription {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
}

export function useRealtimeTable(
  tables: string | TableSubscription | TableSubscription[],
  filterOrCallback: string | (() => void),
  callback?: () => void,
  debounceMs = 300,
) {
  const callbackRef = useRef(callback ?? (filterOrCallback as () => void))
  const latestCallback = callback ?? (filterOrCallback as () => void)

  useEffect(() => {
    callbackRef.current = latestCallback
  })

  const tablesDep = typeof tables === 'string' ? tables : JSON.stringify(tables)
  const filterDep = typeof filterOrCallback === 'string' ? filterOrCallback : ''

  useEffect(() => {
    // Normalize arguments
    let subs: TableSubscription[]
    if (typeof tables === 'string') {
      const filter = typeof filterOrCallback === 'string' ? filterOrCallback : undefined
      subs = [{ table: tables, filter }]
    } else if (!Array.isArray(tables)) {
      subs = [tables]
    } else {
      subs = tables
    }

    if (subs.length === 0) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const debouncedCallback = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => callbackRef.current(), debounceMs)
    }

    const channelName = `rt-${subs.map(s => s.table).join('-')}-${Date.now()}`
    let channel = supabase.channel(channelName)

    for (const sub of subs) {
      channel = channel.on(
        'postgres_changes',
        {
          event: sub.event ?? '*',
          schema: 'public',
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        debouncedCallback,
      )
    }

    channel.subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesDep, filterDep, debounceMs])
}
