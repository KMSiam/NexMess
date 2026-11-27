import {
  BrushCleaning,
  ClipboardList,
  Droplets,
  Flame,
  Home,
  ShoppingCart,
  Trash,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { normalizeSpendingCategory, type SpendingCategoryKey } from '../../../lib/spending'

export interface FinanceCategoryMeta {
  key: SpendingCategoryKey
  icon: LucideIcon
  bgClass: string
  textClass: string
}

export const FINANCE_CATEGORY_META: Record<SpendingCategoryKey, FinanceCategoryMeta> = {
  bazaar: {
    key: 'bazaar',
    icon: ShoppingCart,
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  rent: {
    key: 'rent',
    icon: Home,
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  utilities: {
    key: 'utilities',
    icon: Wrench,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  electricity: {
    key: 'electricity',
    icon: Zap,
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-600 dark:text-yellow-400',
  },
  water: {
    key: 'water',
    icon: Droplets,
    bgClass: 'bg-sky-500/10',
    textClass: 'text-sky-600 dark:text-sky-400',
  },
  gas: {
    key: 'gas',
    icon: Flame,
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
  internet: {
    key: 'internet',
    icon: Wifi,
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-600 dark:text-cyan-400',
  },
  maid: {
    key: 'maid',
    icon: BrushCleaning,
    bgClass: 'bg-violet-500/10',
    textClass: 'text-violet-600 dark:text-violet-400',
  },
  waste: {
    key: 'waste',
    icon: Trash,
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-600 dark:text-teal-400',
  },
  other: {
    key: 'other',
    icon: ClipboardList,
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-600 dark:text-slate-400',
  },
}

/**
 * Resolves icon and color badge styles for any expense or fixed-cost category string.
 */
export function getFinanceCategoryMeta(category: string | null | undefined): FinanceCategoryMeta {
  return FINANCE_CATEGORY_META[normalizeSpendingCategory(category)]
}
