import { useEffect } from 'react'

/**
 * Sets the browser tab title dynamically for authenticated/private app pages,
 * marks them noindex, and clears any inherited root canonical link so private
 * routes never declare the homepage as their canonical URL.
 * Usage: usePageTitle('Dashboard')  →  "Dashboard | NexMess"
 */
export function usePageTitle(page: string) {
  useEffect(() => {
    const prev = document.title
    document.title = `${page} | NexMess`

    const metaRobots = document.querySelector('meta[name="robots"]')
    const prevRobots = metaRobots?.getAttribute('content') ?? null
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow')
    }

    const existingCanonical = document.querySelector('link[rel="canonical"]')
    const prevCanonicalHref = existingCanonical?.getAttribute('href') ?? null
    if (existingCanonical) {
      existingCanonical.remove()
    }

    return () => {
      document.title = prev

      if (metaRobots && prevRobots !== null) {
        metaRobots.setAttribute('content', prevRobots)
      }
      if (prevCanonicalHref && !document.querySelector('link[rel="canonical"]')) {
        const restored = document.createElement('link')
        restored.setAttribute('rel', 'canonical')
        restored.setAttribute('href', prevCanonicalHref)
        document.head.appendChild(restored)
      }
    }
  }, [page])
}
