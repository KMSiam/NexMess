import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type RefreshFn = () => void | Promise<void>

interface RefreshContextValue {
  register: (fn: RefreshFn) => void
  unregister: () => void
  current: RefreshFn | null
}

const RefreshContext = createContext<RefreshContextValue>({
  register: () => {},
  unregister: () => {},
  current: null,
})

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshFn, setRefreshFn] = useState<RefreshFn | null>(null)

  const register = useCallback((fn: RefreshFn) => {
    setRefreshFn(() => fn)
  }, [])

  const unregister = useCallback(() => {
    setRefreshFn(null)
  }, [])

  return (
    <RefreshContext.Provider value={{ register, unregister, current: refreshFn }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRegisterRefresh(fn: RefreshFn) {
  const { register, unregister } = useContext(RefreshContext)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    register(fnRef.current)
    return unregister
  }, [register, unregister])
}

export function useRefreshFn() {
  return useContext(RefreshContext).current
}
