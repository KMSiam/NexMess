import { describe, it, expect } from 'vitest'
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
} from 'lucide-react'
import { getFoodIconMeta } from '../foodIcons'

describe('Meal Routine Food Icons', () => {
  it('maps English and Bengali dish names to crisp Lucide icons', () => {
    expect(getFoodIconMeta('Chicken').icon).toBe(Drumstick)
    expect(getFoodIconMeta('মুরগি').icon).toBe(Drumstick)
    expect(getFoodIconMeta('Fish').icon).toBe(Fish)
    expect(getFoodIconMeta('মাছ').icon).toBe(Fish)
    expect(getFoodIconMeta('Egg').icon).toBe(Egg)
    expect(getFoodIconMeta('ডিম').icon).toBe(Egg)
    expect(getFoodIconMeta('Vegetables').icon).toBe(LeafyGreen)
    expect(getFoodIconMeta('সবজি').icon).toBe(LeafyGreen)
    expect(getFoodIconMeta('Beef').icon).toBe(Beef)
    expect(getFoodIconMeta('Mutton').icon).toBe(Flame)
    expect(getFoodIconMeta('Dal').icon).toBe(Bean)
    expect(getFoodIconMeta('Shrimp').icon).toBe(Shrimp)
    expect(getFoodIconMeta('Khichuri').icon).toBe(CookingPot)
    expect(getFoodIconMeta('Rice').icon).toBe(Wheat)
    expect(getFoodIconMeta('Potato').icon).toBe(Carrot)
  })

  it('falls back to UtensilsCrossed with styling for custom dishes', () => {
    const fallback = getFoodIconMeta('Special Pasta')
    expect(fallback.icon).toBe(UtensilsCrossed)
    expect(fallback.bgClass).toBeTruthy()
    expect(fallback.textClass).toBeTruthy()
  })
})
