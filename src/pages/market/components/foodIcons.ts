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
      bgClass: 'bg-orange-500/10',
      textClass: 'text-orange-600 dark:text-orange-400',
    },
  },
  {
    keywords: ['beef', 'গরু'],
    meta: {
      icon: Beef,
      bgClass: 'bg-rose-500/10',
      textClass: 'text-rose-600 dark:text-rose-400',
    },
  },
  {
    keywords: ['mutton', 'খাসি'],
    meta: {
      icon: Flame,
      bgClass: 'bg-red-500/10',
      textClass: 'text-red-600 dark:text-red-400',
    },
  },
  {
    keywords: ['fish', 'মাছ'],
    meta: {
      icon: Fish,
      bgClass: 'bg-sky-500/10',
      textClass: 'text-sky-600 dark:text-sky-400',
    },
  },
  {
    keywords: ['shrimp', 'চিংড়ি'],
    meta: {
      icon: Shrimp,
      bgClass: 'bg-pink-500/10',
      textClass: 'text-pink-600 dark:text-pink-400',
    },
  },
  {
    keywords: ['egg', 'ডিম'],
    meta: {
      icon: Egg,
      bgClass: 'bg-amber-500/15',
      textClass: 'text-amber-600 dark:text-amber-400',
    },
  },
  {
    keywords: ['veg', 'সবজি', 'শাক'],
    meta: {
      icon: LeafyGreen,
      bgClass: 'bg-emerald-500/10',
      textClass: 'text-emerald-600 dark:text-emerald-400',
    },
  },
  {
    keywords: ['dal', 'lentil', 'ডাল'],
    meta: {
      icon: Bean,
      bgClass: 'bg-yellow-500/15',
      textClass: 'text-yellow-700 dark:text-yellow-400',
    },
  },
  {
    keywords: ['biryani', 'বিরিয়ানি', 'polao', 'পোলাও', 'khichuri', 'খিচুড়ি'],
    meta: {
      icon: CookingPot,
      bgClass: 'bg-violet-500/10',
      textClass: 'text-violet-600 dark:text-violet-400',
    },
  },
  {
    keywords: ['rice', 'ভাত'],
    meta: {
      icon: Wheat,
      bgClass: 'bg-stone-500/10',
      textClass: 'text-stone-600 dark:text-stone-400',
    },
  },
  {
    keywords: ['potato', 'আলু'],
    meta: {
      icon: Carrot,
      bgClass: 'bg-amber-600/10',
      textClass: 'text-amber-700 dark:text-amber-400',
    },
  },
]

const DEFAULT_FOOD_ICON_META: FoodIconMeta = {
  icon: UtensilsCrossed,
  bgClass: 'bg-nex-primary/10',
  textClass: 'text-nex-primary dark:text-emerald-400',
}

/**
 * Resolves a Lucide icon and soft badge styling for a dish name in English or Bengali.
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
