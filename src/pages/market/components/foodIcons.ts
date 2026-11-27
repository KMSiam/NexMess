import {
  Bean,
  Beef,
  Carrot,
  CookingPot,
  Drumstick,
  Egg,
  Fish,
  Flame,
  LeafyGreen,
  Shrimp,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react'

export interface FoodIconMeta {
  icon: LucideIcon
  bgClass: string
  textClass: string
}

const FOOD_ICON_RULES: { keywords: string[]; meta: FoodIconMeta }[] = [
  {
    keywords: ['chicken', 'মুরগি'],
    meta: {
      icon: Drumstick,
      bgClass: 'bg-orange-900/10 dark:bg-orange-400/15',
      textClass: 'text-orange-800 dark:text-orange-300',
    },
  },
  {
    keywords: ['beef', 'গরু'],
    meta: {
      icon: Beef,
      bgClass: 'bg-rose-900/10 dark:bg-rose-400/15',
      textClass: 'text-rose-800 dark:text-rose-300',
    },
  },
  {
    keywords: ['mutton', 'খাসি'],
    meta: {
      icon: Flame,
      bgClass: 'bg-red-900/10 dark:bg-red-400/15',
      textClass: 'text-red-800 dark:text-red-300',
    },
  },
  {
    keywords: ['fish', 'মাছ'],
    meta: {
      icon: Fish,
      bgClass: 'bg-teal-900/10 dark:bg-teal-400/15',
      textClass: 'text-teal-800 dark:text-teal-300',
    },
  },
  {
    keywords: ['shrimp', 'চিংড়ি'],
    meta: {
      icon: Shrimp,
      bgClass: 'bg-amber-900/10 dark:bg-amber-400/15',
      textClass: 'text-amber-800 dark:text-amber-300',
    },
  },
  {
    keywords: ['egg', 'ডিম'],
    meta: {
      icon: Egg,
      bgClass: 'bg-amber-700/10 dark:bg-amber-400/15',
      textClass: 'text-amber-700 dark:text-amber-300',
    },
  },
  {
    keywords: ['veg', 'সবজি', 'শাক'],
    meta: {
      icon: LeafyGreen,
      bgClass: 'bg-nex-primary/12 dark:bg-emerald-500/15',
      textClass: 'text-nex-primary-dark dark:text-emerald-300',
    },
  },
  {
    keywords: ['dal', 'lentil', 'ডাল'],
    meta: {
      icon: Bean,
      bgClass: 'bg-yellow-900/10 dark:bg-yellow-400/15',
      textClass: 'text-yellow-800 dark:text-yellow-300',
    },
  },
  {
    keywords: ['biryani', 'বিরিয়ানি', 'polao', 'পোলাও', 'khichuri', 'খিচুড়ি'],
    meta: {
      icon: CookingPot,
      bgClass: 'bg-amber-800/10 dark:bg-amber-400/15',
      textClass: 'text-amber-900 dark:text-amber-300',
    },
  },
  {
    keywords: ['rice', 'ভাত'],
    meta: {
      icon: Wheat,
      bgClass: 'bg-stone-700/10 dark:bg-stone-400/15',
      textClass: 'text-stone-700 dark:text-stone-300',
    },
  },
  {
    keywords: ['potato', 'আলু'],
    meta: {
      icon: Carrot,
      bgClass: 'bg-orange-800/10 dark:bg-orange-400/15',
      textClass: 'text-orange-800 dark:text-orange-300',
    },
  },
]

const DEFAULT_FOOD_ICON_META: FoodIconMeta = {
  icon: UtensilsCrossed,
  bgClass: 'bg-nex-primary/10 dark:bg-emerald-500/15',
  textClass: 'text-nex-primary dark:text-emerald-300',
}

/**
 * Resolves a Lucide icon and warm editorial badge styling for a dish name in English or Bengali.
 */
export function getFoodIconMeta(foodName: string): FoodIconMeta {
  const lower = (foodName || '').toLowerCase()
  for (const rule of FOOD_ICON_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.meta
    }
  }
  return DEFAULT_FOOD_ICON_META
}
