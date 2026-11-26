import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isMealCutoffPassed,
  mealCutoffLabel,
  mealCutoffCountdown,
  formatCountdownDuration,
  MEAL_CUTOFF_HOURS,
} from '../utils'
import { changeLanguage } from '../i18n'

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

  it('computes accurate live countdown status and urgent threshold in Asia/Dhaka', async () => {
    // 09:15 AM BST = 03:15 AM UTC (45m to Lunch, 6h 45m to Dinner)
    const mockNow = new Date('2026-06-15T03:15:00.000Z')
    const lunchCd = mealCutoffCountdown('2026-06-15', 'lunch', mockNow)
    expect(lunchCd).toEqual({
      status: 'open',
      hoursLeft: 0,
      minutesLeft: 45,
      totalMinutesLeft: 45,
      isUrgent: true,
    })

    const dinnerCd = mealCutoffCountdown('2026-06-15', 'dinner', mockNow)
    expect(dinnerCd).toEqual({
      status: 'open',
      hoursLeft: 6,
      minutesLeft: 45,
      totalMinutesLeft: 405,
      isUrgent: false,
    })

    expect(mealCutoffCountdown('2026-06-14', 'lunch', mockNow).status).toBe('past')
    expect(mealCutoffCountdown('2026-06-16', 'lunch', mockNow).status).toBe('future')

    await changeLanguage('en')
    expect(formatCountdownDuration(2, 15)).toBe('2h 15m')
    expect(formatCountdownDuration(0, 45)).toBe('45m')

    await changeLanguage('bn')
    expect(formatCountdownDuration(2, 15)).toBe('২ ঘঃ ১৫ মিঃ')
    await changeLanguage('en')
  })
})
