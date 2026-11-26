import { describe, it, expect } from 'vitest'
import {
  buildMealMatrixData,
  buildReportPdf,
  formatMealValue,
  formatTk,
  parseLocalDateStr,
  sanitizePdfFilename,
  sanitizePdfText,
} from '../reportPdf'
import type { ReportData } from '../reportSettlements'

describe('PDF Report Generation Utilities', () => {
  it('parses YYYY-MM-DD in local calendar time without UTC day-shift', () => {
    const parsed = parseLocalDateStr('2026-11-27')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(10)
    expect(parsed.getDate()).toBe(27)
  })

  it('formats Tk currency with commas and clean negative sign', () => {
    expect(formatTk(15450)).toBe('Tk 15,450.00')
    expect(formatTk(-2500.5)).toBe('Tk -2,500.50')
    expect(formatTk(2000, 0)).toBe('Tk 2,000')
    expect(formatTk(0)).toBe('Tk 0.00')
  })

  it('formats meal counts cleanly without unnecessary decimals', () => {
    expect(formatMealValue(0)).toBe('0')
    expect(formatMealValue(12)).toBe('12')
    expect(formatMealValue(12.5)).toBe('12.5')
  })

  it('sanitizes unsupported WinAnsi glyphs and unsafe filename characters', () => {
    expect(sanitizePdfText('৳ 500 ★ Alice → Bob — “Note”')).toBe('Tk  500 * Alice -> Bob - "Note"')
    expect(sanitizePdfFilename('Bachelor / Point: Mess #1', '2026-11')).toBe(
      'NexMess_Bachelor_Point_Mess_1_Financial_Record_2026-11.pdf',
    )
    expect(sanitizePdfFilename('   ', '2026-11')).toBe('NexMess_Mess_Financial_Record_2026-11.pdf')
  })

  it('builds the meal history matrix in O(N) time with accurate totals', () => {
    const days = [new Date(2026, 10, 1), new Date(2026, 10, 2)]
    const members = [
      { user_id: 'u1', username: 'Alice', meals: 3, mealCost: 150, deposited: 500 },
      { user_id: 'u2', username: 'Bob', meals: 2.5, mealCost: 125, deposited: 0 },
    ]
    const dailyMeals = [
      {
        date: '2026-11-01',
        user_id: 'u1',
        username: 'Alice',
        lunch: true,
        dinner: true,
        guest_lunch: 1,
        guest_dinner: 0,
      },
      {
        date: '2026-11-02',
        user_id: 'u2',
        username: 'Bob',
        lunch: true,
        dinner: true,
        guest_lunch: 0,
        guest_dinner: 0.5,
      },
    ]

    const matrix = buildMealMatrixData(days, members, dailyMeals, 5.5)

    expect(matrix.headers).toEqual(['Date', 'Alice', 'Bob', 'Total'])
    expect(matrix.rows).toEqual([
      ['01 Nov (Sun)', '3', '-', '3'],
      ['02 Nov (Mon)', '-', '2.5', '2.5'],
    ])
    expect(matrix.footers).toEqual(['Total Meals', '3', '2.5', '5.5'])
  })

  it('generates both standard and landscape multi-member archived PDFs without errors', () => {
    const baseData: ReportData = {
      messName: 'BachelorPoint / Dhaka',
      messLocation: '337 East Nakhalpara, Tejgaon, Dhaka',
      month: '2026-11',
      generatedBy: 'Siam',
      isArchived: true,
      totalExpenses: 15450,
      totalDeposits: 25000,
      totalFixed: 8000,
      mealRate: 51.5,
      totalMeals: 300,
      financeMembersCount: 2,
      members: [
        { user_id: 'u1', username: 'Siam', status: 'approved', meals: 150, mealCost: 7725, deposited: 15000 },
        { user_id: 'u2', username: 'Rakib', status: 'left', meals: 150, mealCost: 7725, deposited: 10000 },
      ],
      fixedCosts: [{ description: 'rent (House)', amount: 8000 }],
      settlements: [
        { from: 'Rakib', to: 'Mess Treasury/Manager', amount: 1725 },
        { from: 'Mess Treasury/Manager', to: 'Siam', amount: 3275 },
      ],
      dailyExpenses: [
        { date: '2026-11-05', category: 'bazaar', description: 'Rice & Oil', amount: 15450, logged_by: 'Siam' },
      ],
      dailyDeposits: [
        { date: '2026-11-02', username: 'Siam', amount: 15000, note: 'Bkash' },
      ],
      dailyMeals: [
        { date: '2026-11-01', user_id: 'u1', username: 'Siam', lunch: true, dinner: true, guest_lunch: 0, guest_dinner: 0 },
      ],
    }

    const portraitDoc = buildReportPdf(baseData, { download: false })
    expect(portraitDoc.getNumberOfPages()).toBeGreaterThanOrEqual(2)

    // Test >8 member matrix path (switches matrix page to landscape) & zero-settlements branch
    const wideMembers = Array.from({ length: 10 }, (_, idx) => ({
      user_id: `u-${idx + 1}`,
      username: `Member ${idx + 1}`,
      meals: 10,
      mealCost: 500,
      deposited: 1000,
    }))
    const landscapeDoc = buildReportPdf(
      {
        ...baseData,
        isArchived: false,
        financeMembersCount: 10,
        members: wideMembers,
        settlements: [],
      },
      { download: false },
    )

    const lastPage = landscapeDoc.getNumberOfPages()
    landscapeDoc.setPage(lastPage)
    expect(landscapeDoc.internal.pageSize.getWidth()).toBeGreaterThan(
      landscapeDoc.internal.pageSize.getHeight(),
    )
    // All 30 days should fit cleanly on a single landscape matrix page (3 total pages)
    expect(lastPage).toBe(3)
  })
})
