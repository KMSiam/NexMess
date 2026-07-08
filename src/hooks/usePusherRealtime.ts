'use client'

import { useEffect, useRef } from 'react'
import { getPusherClient, getMessChannel, EVENTS } from '@/lib/pusher'

/**
 * Replacement for Supabase's useRealtimeTable hook.
 * Subscribes to a Pusher channel for the current mess and calls
 * the callback whenever a `db-change` event is received for any of
 * the specified tables.
 *
 * Server Actions trigger Pusher events after every write, so clients
 * refetch fresh data on-demand.
 *
 * Usage:
 *   usePusherRealtime(messId, 'meals', fetchMeals)
 *   usePusherRealtime(messId, ['expenses', 'deposits'], fetchAll)
 */
export function usePusherRealtime(
  messId: string | null | undefined,
  tables: string | string[],
  callback: () => void,
  debounceMs = 300
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  const tablesDep = Array.isArray(tables) ? tables.join(',') : tables

  useEffect(() => {
    if (!messId) return

    const tableSet = new Set(Array.isArray(tables) ? tables : [tables])
    const pusher = getPusherClient()
    const channel = pusher.subscribe(getMessChannel(messId))

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const handler = (data: { table: string }) => {
      if (tableSet.size === 0 || tableSet.has(data.table)) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => callbackRef.current(), debounceMs)
      }
    }

    channel.bind(EVENTS.DB_CHANGE, handler)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      channel.unbind(EVENTS.DB_CHANGE, handler)
      pusher.unsubscribe(getMessChannel(messId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messId, tablesDep, debounceMs])
}
