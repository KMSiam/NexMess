export interface ReportMemberRow {
  user_id: string
  username: string
  status?: 'pending' | 'approved' | 'left'
  meals: number
  mealCost: number
  deposited: number
}

export interface ReportFixedCostRow {
  description: string
  amount: number
}

export interface ReportSettlement {
  from: string
  to: string
  amount: number
}

export interface ReportExpenseRow {
  date: string
  category?: string
  description?: string
  amount: number
  logged_by?: string
}

export interface ReportMealRow {
  date: string
  username: string
  user_id: string
  lunch: boolean
  dinner: boolean
  guest_lunch: number
  guest_dinner: number
}

export interface ReportDepositRow {
  date: string
  username: string
  amount: number
  note: string
}

export interface ReportData {
  messName: string
  messLocation?: string | null
  month: string // 'YYYY-MM'
  generatedBy?: string // username, or 'Auto'/'Manager'
  isArchived?: boolean // header wording
  // Global summary
  totalExpenses: number
  totalDeposits: number
  totalFixed: number
  mealRate: number
  totalMeals: number
  // Rows
  financeMembersCount: number // for per-person fixed-cost split
  members: ReportMemberRow[]
  fixedCosts: ReportFixedCostRow[]
  settlements: ReportSettlement[]
  // Details
  dailyExpenses?: ReportExpenseRow[]
  dailyMeals?: ReportMealRow[]
  dailyDeposits?: ReportDepositRow[]
}

/**
 * Compute settlements using centralized Mess Treasury/Manager clearing.
 */
export function computeSettlements(
  members: ReportMemberRow[],
  perPersonFixed: number,
): ReportSettlement[] {
  const creditors: { name: string; amount: number }[] = []
  const debtors: { name: string; amount: number }[] = []

  members.forEach((m) => {
    const totalExp = m.mealCost + perPersonFixed
    const realBalance = m.deposited - totalExp
    const name = m.username || 'Member'
    if (realBalance > 0.5) creditors.push({ name, amount: realBalance })
    else if (realBalance < -0.5) debtors.push({ name, amount: -realBalance })
  })

  const transfers: ReportSettlement[] = []

  // 1. Debtors pay to Mess Treasury/Manager
  debtors.forEach((d) => {
    transfers.push({
      from: d.name,
      to: 'Mess Treasury/Manager',
      amount: Math.round(d.amount),
    })
  })

  // 2. Mess Treasury/Manager pays to Creditors
  creditors.forEach((c) => {
    transfers.push({
      from: 'Mess Treasury/Manager',
      to: c.name,
      amount: Math.round(c.amount),
    })
  })

  return transfers
}
