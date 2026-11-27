export const FIXED_COST_CATEGORIES = [
  'rent',
  'utilities',
  'electricity',
  'water',
  'gas',
  'internet',
  'maid',
  'waste',
  'other',
] as const

export type FixedCostCategory = (typeof FIXED_COST_CATEGORIES)[number]

export type SpendingCategoryKey = 'bazaar' | FixedCostCategory

export interface SpendingCategorySlice {
  category: SpendingCategoryKey
  amount: number
  percent: number
  colorClass: string
  dotClass: string
}

export interface SpendingBreakdownResult {
  totalVariable: number
  totalFixed: number
  totalOutflow: number
  totalDeposits: number
  depositUtilizationPercent: number
  isOverBudget: boolean
  slices: SpendingCategorySlice[]
}

const CATEGORY_ALIAS: Record<string, SpendingCategoryKey> = {
  bazaar: 'bazaar',
  rent: 'rent',
  utilities: 'utilities',
  utility: 'utilities',
  electricity: 'electricity',
  electric: 'electricity',
  water: 'water',
  pani: 'water',
  gas: 'gas',
  internet: 'internet',
  wifi: 'internet',
  maid: 'maid',
  waste: 'waste',
  moyla: 'waste',
  garbage: 'waste',
  other: 'other',
}

const CATEGORY_STYLES: Record<SpendingCategoryKey, { colorClass: string; dotClass: string }> = {
  bazaar: { colorClass: 'bg-[#4a6d56]', dotClass: 'bg-[#4a6d56]' },
  rent: { colorClass: 'bg-stone-700 dark:bg-stone-400', dotClass: 'bg-stone-700 dark:bg-stone-400' },
  utilities: { colorClass: 'bg-amber-600', dotClass: 'bg-amber-600' },
  electricity: { colorClass: 'bg-amber-500', dotClass: 'bg-amber-500' },
  water: { colorClass: 'bg-teal-700', dotClass: 'bg-teal-700' },
  gas: { colorClass: 'bg-orange-700', dotClass: 'bg-orange-700' },
  internet: { colorClass: 'bg-emerald-700', dotClass: 'bg-emerald-700' },
  maid: { colorClass: 'bg-rose-700', dotClass: 'bg-rose-700' },
  waste: { colorClass: 'bg-stone-500', dotClass: 'bg-stone-500' },
  other: { colorClass: 'bg-stone-400 dark:bg-stone-500', dotClass: 'bg-stone-400 dark:bg-stone-500' },
}

export function normalizeSpendingCategory(raw: string | null | undefined): SpendingCategoryKey {
  const key = (raw || '').trim().toLowerCase()
  return CATEGORY_ALIAS[key] || 'other'
}

export function computeSpendingBreakdown(
  expenses: { amount: number | string; category?: string | null }[],
  fixedCosts: { amount: number | string; category?: string | null }[],
  totalDeposits: number
): SpendingBreakdownResult {
  const totals: Record<SpendingCategoryKey, number> = {
    bazaar: 0,
    rent: 0,
    utilities: 0,
    electricity: 0,
    water: 0,
    gas: 0,
    internet: 0,
    maid: 0,
    waste: 0,
    other: 0,
  }

  let totalVariable = 0
  for (const exp of expenses) {
    const val = Math.max(0, Number(exp.amount) || 0)
    if (val === 0) continue
    totalVariable += val
    const cat = normalizeSpendingCategory(exp.category)
    totals[cat] += val
  }

  let totalFixed = 0
  for (const fc of fixedCosts) {
    const val = Math.max(0, Number(fc.amount) || 0)
    if (val === 0) continue
    totalFixed += val
    const cat = normalizeSpendingCategory(fc.category)
    totals[cat] += val
  }

  const totalOutflow = totalVariable + totalFixed
  const safeDeposits = Math.max(0, Number(totalDeposits) || 0)
  const depositUtilizationPercent =
    safeDeposits > 0 ? Math.round((totalOutflow / safeDeposits) * 100) : totalOutflow > 0 ? 100 : 0

  const slices: SpendingCategorySlice[] = (Object.keys(totals) as SpendingCategoryKey[])
    .filter((cat) => totals[cat] > 0)
    .sort((a, b) => totals[b] - totals[a])
    .map((cat) => ({
      category: cat,
      amount: Math.round(totals[cat] * 100) / 100,
      percent: totalOutflow > 0 ? Math.round((totals[cat] / totalOutflow) * 1000) / 10 : 0,
      ...CATEGORY_STYLES[cat],
    }))

  return {
    totalVariable: Math.round(totalVariable * 100) / 100,
    totalFixed: Math.round(totalFixed * 100) / 100,
    totalOutflow: Math.round(totalOutflow * 100) / 100,
    totalDeposits: Math.round(safeDeposits * 100) / 100,
    depositUtilizationPercent,
    isOverBudget: safeDeposits > 0 && totalOutflow > safeDeposits,
    slices,
  }
}
