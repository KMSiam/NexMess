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
    bgClass: 'bg-nex-primary/12 dark:bg-emerald-500/15',
    textClass: 'text-nex-primary-dark dark:text-emerald-300',
  },
  rent: {
    key: 'rent',
    icon: Home,
    bgClass: 'bg-stone-800/10 dark:bg-stone-400/15',
    textClass: 'text-stone-800 dark:text-stone-200',
  },
  utilities: {
    key: 'utilities',
    icon: Wrench,
    bgClass: 'bg-amber-900/10 dark:bg-amber-400/15',
    textClass: 'text-amber-800 dark:text-amber-300',
  },
  electricity: {
    key: 'electricity',
    icon: Zap,
    bgClass: 'bg-amber-700/12 dark:bg-amber-400/15',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
  water: {
    key: 'water',
    icon: Droplets,
    bgClass: 'bg-teal-900/10 dark:bg-teal-400/15',
    textClass: 'text-teal-800 dark:text-teal-300',
  },
  gas: {
    key: 'gas',
    icon: Flame,
    bgClass: 'bg-orange-900/10 dark:bg-orange-400/15',
    textClass: 'text-orange-800 dark:text-orange-300',
  },
  internet: {
    key: 'internet',
    icon: Wifi,
    bgClass: 'bg-emerald-900/10 dark:bg-emerald-400/15',
    textClass: 'text-emerald-800 dark:text-emerald-300',
  },
  maid: {
    key: 'maid',
    icon: BrushCleaning,
    bgClass: 'bg-rose-900/10 dark:bg-rose-400/15',
    textClass: 'text-rose-800 dark:text-rose-300',
  },
  waste: {
    key: 'waste',
    icon: Trash,
    bgClass: 'bg-stone-700/10 dark:bg-stone-400/15',
    textClass: 'text-stone-700 dark:text-stone-300',
  },
  other: {
    key: 'other',
    icon: ClipboardList,
    bgClass: 'bg-stone-600/10 dark:bg-stone-400/15',
    textClass: 'text-stone-600 dark:text-stone-300',
  },
}

/**
 * Resolves warm editorial icon and badge styles for any expense or fixed-cost category string.
 */
export function getFinanceCategoryMeta(category: string | null | undefined): FinanceCategoryMeta {
  return FINANCE_CATEGORY_META[normalizeSpendingCategory(category)]
}
