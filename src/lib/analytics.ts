import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com'

let isInitialized = false

/**
 * Initializes PostHog for privacy-respecting product analytics and funnel telemetry.
 * Operates gracefully as a no-op if VITE_POSTHOG_KEY is not configured.
 */
export function initAnalytics() {
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.info('[Analytics] VITE_POSTHOG_KEY is not configured. Analytics running in local mock mode.')
    }
    return
  }

  // Respect user's browser Do Not Track (DNT) preference
  const doNotTrack =
    navigator.doNotTrack === '1' ||
    (window as unknown as { doNotTrack?: string }).doNotTrack === '1'
  if (doNotTrack) {
    console.info('[Analytics] Respecting browser Do Not Track (DNT) signal.')
    return
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: false, // We manually trigger pageviews on React Router route changes
    capture_pageleave: true,
    persistence: 'localStorage',
    disable_session_recording: false,
    sanitize_properties: (properties) => {
      // Strip any sensitive passwords or tokens before ingestion
      if (properties.password) delete properties.password
      if (properties.token) delete properties.token
      return properties
    },
  })

  isInitialized = true
}

/**
 * Tracks SPA virtual pageviews when the React Router location changes.
 */
export function trackPageView(path: string, title?: string) {
  if (!isInitialized) {
    if (import.meta.env.DEV) {
      console.debug('[Analytics PageView]', path, title)
    }
    return
  }

  posthog.capture('$pageview', {
    $current_url: window.location.origin + path,
    title: title || document.title,
  })
}

/**
 * Identifies the authenticated user to link cross-session usage.
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!isInitialized) return
  posthog.identify(userId, traits)
}

/**
 * Clears the user identity and resets session cookies upon logout.
 */
export function resetUser() {
  if (!isInitialized) return
  posthog.reset()
}

/**
 * Tracks high-value business & conversion funnel events.
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!isInitialized) {
    if (import.meta.env.DEV) {
      console.debug('[Analytics Event]', eventName, properties)
    }
    return
  }

  posthog.capture(eventName, properties)
}

/**
 * Standardized funnel event names for NexMess
 */
export const AnalyticsEvents = {
  AUTH_LOGIN: 'user_logged_in',
  AUTH_REGISTER: 'user_registered',
  AUTH_LOGOUT: 'user_logged_out',
  MESS_CREATE: 'mess_created',
  MESS_JOIN_REQUESTED: 'mess_join_requested',
  MEAL_TOGGLED: 'meal_toggled',
  EXPENSE_ADDED: 'expense_added',
  DEPOSIT_SUBMITTED: 'deposit_submitted',
  PDF_EXPORTED: 'pdf_statement_exported',
  AI_MARKET_QUERY: 'ai_market_query_sent',
} as const
