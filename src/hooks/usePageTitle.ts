import { useEffect } from 'react'

/**
 * Sets the browser tab title dynamically.
 * Usage: usePageTitle('Dashboard')  →  "Dashboard | NexMess"
 */
export function usePageTitle(page: string) {
  useEffect(() => {
    const prev = document.title
    document.title = `${page} | NexMess`
    return () => {
      document.title = prev
    }
  }, [page])
}
