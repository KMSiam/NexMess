import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMealCutoffPassed, mealCutoffLabel, MEAL_CUTOFF_HOURS } from '../utils'

describe('Timezone-Aware Meal Cut-Off Engine', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('correctly reports cutoff labels', () => {
    expect(mealCutoffLabel('lunch')).toBe('10:00 AM')
    expect(mealCutoffLabel('dinner')).toBe('4:00 PM')
  })

  it('defines standard cutoff hours in Asia/Dhaka time', () => {
    expect(MEAL_CUTOFF_HOURS.lunch).toBe(10)
    expect(MEAL_CUTOFF_HOURS.dinner).toBe(16)
  })

  it('always marks past dates as passed regardless of time', () => {
    const yesterday = '2026-01-01'
    expect(isMealCutoffPassed(yesterday, 'lunch')).toBe(true)
    expect(isMealCutoffPassed(yesterday, 'dinner')).toBe(true)
  })

  it('always marks future dates as NOT passed', () => {
    const futureDate = '2030-12-31'
    expect(isMealCutoffPassed(futureDate, 'lunch')).toBe(false)
    expect(isMealCutoffPassed(futureDate, 'dinner')).toBe(false)
  })

  it('correctly locks lunch at or after 10:00 AM BST on the current day', () => {
    // 10:05 AM BST = 04:05 AM UTC
    const mockDate = new Date('2026-06-15T04:05:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const todayDateStr = '2026-06-15'
    expect(isMealCutoffPassed(todayDateStr, 'lunch')).toBe(true)
    // Dinner (4:00 PM) should still be open
    expect(isMealCutoffPassed(todayDateStr, 'dinner')).toBe(false)
  })

  it('correctly keeps lunch open before 10:00 AM BST on the current day', () => {
    // 08:30 AM BST = 02:30 AM UTC
    const mockDate = new Date('2026-06-15T02:30:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const todayDateStr = '2026-06-15'
    expect(isMealCutoffPassed(todayDateStr, 'lunch')).toBe(false)
    expect(isMealCutoffPassed(todayDateStr, 'dinner')).toBe(false)
  })

  it('correctly locks dinner at or after 4:00 PM (16:00) BST on the current day', () => {
    // 04:15 PM BST = 10:15 AM UTC
    const mockDate = new Date('2026-06-15T10:15:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const todayDateStr = '2026-06-15'
    expect(isMealCutoffPassed(todayDateStr, 'lunch')).toBe(true)
    expect(isMealCutoffPassed(todayDateStr, 'dinner')).toBe(true)
  })
})
