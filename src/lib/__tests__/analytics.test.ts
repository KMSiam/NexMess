import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initAnalytics, trackPageView, trackEvent, identifyUser, resetUser, AnalyticsEvents } from '../analytics'

describe('Analytics & Telemetry Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exports standardized SaaS conversion funnel event constants', () => {
    expect(AnalyticsEvents.AUTH_LOGIN).toBe('user_logged_in')
    expect(AnalyticsEvents.AUTH_REGISTER).toBe('user_registered')
    expect(AnalyticsEvents.MESS_CREATE).toBe('mess_created')
    expect(AnalyticsEvents.MEAL_TOGGLED).toBe('meal_toggled')
    expect(AnalyticsEvents.EXPENSE_ADDED).toBe('expense_added')
    expect(AnalyticsEvents.PDF_EXPORTED).toBe('pdf_statement_exported')
  })

  it('runs safely as a non-breaking no-op when VITE_POSTHOG_KEY is absent', () => {
    expect(() => {
      initAnalytics()
      trackPageView('/dashboard', 'Dashboard')
      trackEvent(AnalyticsEvents.MEAL_TOGGLED, { type: 'lunch' })
      identifyUser('user-123', { role: 'manager' })
      resetUser()
    }).not.toThrow()
  })
})
