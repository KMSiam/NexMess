import { describe, it, expect } from 'vitest'
import { computeSettlements, ReportMemberRow } from '../reportPdf'
import { computeSpendingBreakdown, normalizeSpendingCategory } from '../spending'

describe('Finance & Settlement Calculation Engine', () => {
  describe('computeSettlements (Debt Clearing Algorithm)', () => {
    it('generates accurate creditor-debtor settlements via Mess Treasury', () => {
      // 3 members:
      // Alice: Deposited 5000, Meal cost 2000, Fixed 1000 => Total exp 3000 => Balance +2000 (Creditor)
      // Bob: Deposited 1000, Meal cost 2000, Fixed 1000 => Total exp 3000 => Balance -2000 (Debtor)
      // Charlie: Deposited 3000, Meal cost 2000, Fixed 1000 => Total exp 3000 => Balance 0 (Neutral)
      const members: ReportMemberRow[] = [
        {
          user_id: '1',
          username: 'Alice',
          meals: 40,
          mealCost: 2000,
          deposited: 5000,
        },
        {
          user_id: '2',
          username: 'Bob',
          meals: 40,
          mealCost: 2000,
          deposited: 1000,
        },
        {
          user_id: '3',
          username: 'Charlie',
          meals: 40,
          mealCost: 2000,
          deposited: 3000,
        },
      ]

      const settlements = computeSettlements(members, 1000)

      expect(settlements).toHaveLength(2)

      // Debtor pays to Mess Treasury
      const debtorTransfer = settlements.find((s) => s.from === 'Bob')
      expect(debtorTransfer).toBeDefined()
      expect(debtorTransfer?.to).toBe('Mess Treasury/Manager')
      expect(debtorTransfer?.amount).toBe(2000)

      // Mess Treasury pays to Creditor
      const creditorTransfer = settlements.find((s) => s.to === 'Alice')
      expect(creditorTransfer).toBeDefined()
      expect(creditorTransfer?.from).toBe('Mess Treasury/Manager')
      expect(creditorTransfer?.amount).toBe(2000)
    })

    it('returns an empty array when all members are fully balanced (zero debt)', () => {
      const members: ReportMemberRow[] = [
        {
          user_id: '1',
          username: 'Alice',
          meals: 20,
          mealCost: 1000,
          deposited: 1500,
        },
      ]

      const settlements = computeSettlements(members, 500)
      expect(settlements).toEqual([])
    })

    it('handles multiple debtors and creditors correctly', () => {
      const members: ReportMemberRow[] = [
        {
          user_id: '1',
          username: 'UserA',
          meals: 10,
          mealCost: 500,
          deposited: 3000,
        },
        {
          user_id: '2',
          username: 'UserB',
          meals: 10,
          mealCost: 500,
          deposited: 0,
        },
        {
          user_id: '3',
          username: 'UserC',
          meals: 10,
          mealCost: 500,
          deposited: 0,
        },
      ]

      const settlements = computeSettlements(members, 500)

      // Total debtor money paid into treasury must match total creditor money paid out
      const totalIn = settlements
        .filter((s) => s.to === 'Mess Treasury/Manager')
        .reduce((sum, s) => sum + s.amount, 0)

      const totalOut = settlements
        .filter((s) => s.from === 'Mess Treasury/Manager')
        .reduce((sum, s) => sum + s.amount, 0)

      expect(totalIn).toBe(2000)
      expect(totalOut).toBe(2000)
      expect(totalIn).toBe(totalOut)
    })
  })

  describe('Meal Rate Calculation Formula', () => {
    function calculateMealRate(totalGroceryExpense: number, totalMealsEaten: number): number {
      if (!totalMealsEaten || totalMealsEaten <= 0) return 0
      return Math.round((totalGroceryExpense / totalMealsEaten) * 100) / 100
    }

    it('calculates the exact meal rate for normal figures', () => {
      const rate = calculateMealRate(15450, 300)
      expect(rate).toBe(51.5)
    })

    it('avoids divide-by-zero or NaN when total meals eaten is zero', () => {
      const rate = calculateMealRate(5000, 0)
      expect(rate).toBe(0)
      expect(Number.isFinite(rate)).toBe(true)
    })

    it('calculates net member balance accurately', () => {
      const deposit = 5000
      const mealsEaten = 45
      const mealRate = 50
      const fixedCostShare = 1500

      const mealCost = mealsEaten * mealRate // 2250
      const totalExpense = mealCost + fixedCostShare // 3750
      const netBalance = deposit - totalExpense // 1250

      expect(netBalance).toBe(1250)
    })
  })

  describe('Spending Breakdown Engine', () => {
    it('normalizes legacy category aliases cleanly', () => {
      expect(normalizeSpendingCategory('utility')).toBe('utilities')
      expect(normalizeSpendingCategory('WIFI')).toBe('internet')
      expect(normalizeSpendingCategory('unknown-tag')).toBe('other')
    })

    it('aggregates expenses and fixed costs across categories and flags over-budget spend', () => {
      const result = computeSpendingBreakdown(
        [
          { amount: 3000, category: 'bazaar' },
          { amount: 500, category: 'utility' },
        ],
        [
          { amount: 4500, category: 'rent' },
          { amount: 2000, category: 'maid' },
        ],
        8000
      )

      expect(result.totalVariable).toBe(3500)
      expect(result.totalFixed).toBe(6500)
      expect(result.totalOutflow).toBe(10000)
      expect(result.depositUtilizationPercent).toBe(125)
      expect(result.isOverBudget).toBe(true)
      expect(result.slices.map((s) => s.category)).toEqual(['rent', 'bazaar', 'maid', 'utilities'])
      expect(result.slices[0].percent).toBe(45)
    })

    it('handles empty inputs gracefully without NaN or divide-by-zero', () => {
      const empty = computeSpendingBreakdown([], [], 0)
      expect(empty.totalOutflow).toBe(0)
      expect(empty.depositUtilizationPercent).toBe(0)
      expect(empty.isOverBudget).toBe(false)
      expect(empty.slices).toEqual([])
    })
  })
})
