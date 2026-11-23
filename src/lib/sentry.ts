import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

/**
 * Initializes Sentry for client-side crash monitoring, performance tracing, and session replay.
 * Operates gracefully as a no-op if VITE_SENTRY_DSN is not configured.
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.info('[Sentry] VITE_SENTRY_DSN is not configured. Error monitoring is disabled in local development.')
    }
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',
    release: 'nexmess@1.26.4',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Tracing sampling rate
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // Replay sampling: 10% of sessions, 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Sanitize any personally identifiable data before transmission
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['apikey']
      }
      return event
    },
    // Ignore common non-actionable browser extension noise
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  })
}

/**
 * Capture an exception manually to Sentry with optional extra context tags.
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.error('[Sentry Local]', error, context)
    }
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Associate the active logged-in user with Sentry error traces.
 */
export function setUserContext(userId: string, email?: string) {
  if (!SENTRY_DSN) return
  Sentry.setUser({
    id: userId,
    email: email,
  })
}

/**
 * Clear user context when the user logs out.
 */
export function clearUserContext() {
  if (!SENTRY_DSN) return
  Sentry.setUser(null)
}

export { Sentry }
