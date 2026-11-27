import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockChannelObj = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}

const mockFrom = vi.fn<(table: string) => unknown>()
const mockRpc = vi.fn<(fn: string, params?: unknown) => Promise<{ data: unknown }>>()
const mockChannel = vi.fn<(name: string) => typeof mockChannelObj>(() => mockChannelObj)
const mockRemoveChannel = vi.fn<(channel: unknown) => Promise<string>>()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, params?: unknown) => mockRpc(fn, params),
    channel: (name: string) => mockChannel(name),
    removeChannel: (channel: unknown) => mockRemoveChannel(channel),
  },
}))

import { useDashboardData } from '../useDashboardData'
import { useFinanceData } from '../useFinanceData'
import { createRealtimeChannelName } from '../useRealtimeTable'

function createChain(result: { data?: unknown; count?: number | null; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'gte', 'lte', 'order', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn(() => Promise.resolve(result))
  chain.maybeSingle = vi.fn(() => Promise.resolve(result))
  chain.then = (resolve: (val: unknown) => unknown, reject?: (err: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

describe('Navigation Data Loading Hooks', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it('creates unique Supabase channel names across rapid mounts', () => {
    const a = createRealtimeChannelName('chat-realtime-m1')
    const b = createRealtimeChannelName('chat-realtime-m1')
    expect(a).not.toBe(b)
    expect(a.startsWith('chat-realtime-m1-')).toBe(true)
  })

  it('marks Dashboard dataLoaded even when a Supabase request rejects and avoids broken undefined subscriptions', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'notices') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.reject(new Error('Network aborted')),
              }),
            }),
          }),
        }
      }
      return createChain({ data: [], count: 0 })
    })
    mockRpc.mockResolvedValue({ data: null })

    let latestState: ReturnType<typeof useDashboardData> | null = null

    function Probe({ uid, mid }: { uid?: string; mid?: string }) {
      latestState = useDashboardData(uid, 'Siam', mid)
      return <div data-loaded={String(latestState.dataLoaded)} />
    }

    act(() => {
      root.render(<Probe uid="u1" mid={undefined} />)
    })
    expect(mockChannel).not.toHaveBeenCalled()

    act(() => {
      root.render(<Probe uid="u1" mid="m1" />)
    })

    await vi.waitFor(() => {
      expect(latestState!.dataLoaded).toBe(true)
    })
  })

  it('keeps Finance loaded without re-flashing loading skeleton when members hydrate asynchronously', async () => {
    mockFrom.mockImplementation(() => createChain({ data: [] }))
    mockRpc.mockResolvedValue({ data: { personal_meals: 10, balance: 500, meal_rate: 70 } })

    const loadingHistory: boolean[] = []
    let latestState: ReturnType<typeof useFinanceData> | null = null

    function Probe({
      mid,
      members,
    }: {
      mid?: string
      members: { user_id: string; status: string }[]
    }) {
      latestState = useFinanceData(mid, members)
      loadingHistory.push(latestState.loading)
      return null
    }

    act(() => {
      root.render(<Probe mid="m1" members={[]} />)
    })

    await vi.waitFor(() => {
      expect(latestState!.loading).toBe(false)
    })
    loadingHistory.length = 0

    // Asynchronous member store hydration updates membersList without flashing loading=true
    act(() => {
      root.render(<Probe mid="m1" members={[{ user_id: 'u1', status: 'approved' }]} />)
    })

    await vi.waitFor(() => {
      expect(latestState!.balances['u1']).toEqual({ personal_meals: 10, balance: 500, meal_rate: 70 })
    })
    expect(loadingHistory).not.toContain(true)
    expect(latestState!.loading).toBe(false)
  })
})
