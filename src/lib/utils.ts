import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateMessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'NEX-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function formatCurrency(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getFoodEmoji(foodName: string) {
  const lower = foodName.toLowerCase()
  if (lower.includes('chicken') || lower.includes('মুরগি')) return '🍗'
  if (lower.includes('beef') || lower.includes('গরু')) return '🥩'
  if (lower.includes('fish') || lower.includes('মাছ')) return '🐟'
  if (lower.includes('egg') || lower.includes('ডিম')) return '🥚'
  if (lower.includes('veg') || lower.includes('সবজি') || lower.includes('শাক')) return '🥬'
  if (lower.includes('dal') || lower.includes('ডাল') || lower.includes('lentil')) return '🥣'
  if (lower.includes('mutton') || lower.includes('খাসি')) return '🍖'
  if (lower.includes('biryani') || lower.includes('বিরিয়ানি') || lower.includes('polao'))
    return '🍲'
  if (lower.includes('khichuri') || lower.includes('খিচুড়ি')) return '🍛'
  if (lower.includes('rice') || lower.includes('ভাত')) return '🍚'
  if (lower.includes('potato') || lower.includes('আলু')) return '🥔'
  return '🍽️'
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Meal cut-off times — Asia/Dhaka. After cut-off, the meal for *today* can't be toggled.
// Past dates are blocked elsewhere; future dates are always editable.
export const MEAL_CUTOFF_HOURS = { lunch: 10, dinner: 16 } as const

function dhakaParts(d: Date = new Date()) {
  // Dhaka is always UTC+6, no DST — use direct arithmetic to avoid browser Intl hour12 bugs
  // (some browsers return 1-12 for hour12:false instead of 0-23)
  const t = new Date(d.getTime() + 6 * 60 * 60 * 1000)
  return {
    dateStr: `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`,
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
  }
}

export function isMealCutoffPassed(dateStr: string, type: 'lunch' | 'dinner'): boolean {
  const todayDhaka = dhakaToday()
  if (dateStr < todayDhaka) return true // Past dates are always locked
  if (dateStr > todayDhaka) return false // Future dates are never locked

  const { hour } = dhakaParts()
  return hour >= MEAL_CUTOFF_HOURS[type]
}

export function mealCutoffLabel(type: 'lunch' | 'dinner'): string {
  return type === 'lunch' ? '10:00 AM' : '4:00 PM'
}

// Is the cut-off approaching within `windowMinutes` (default 60)?
// Returns minutesLeft when in window, otherwise null.
export function mealCutoffApproaching(type: 'lunch' | 'dinner', windowMinutes = 60): number | null {
  const { hour, minute } = dhakaParts()
  const cutoffH = MEAL_CUTOFF_HOURS[type]
  const minutesNow = hour * 60 + minute
  const minutesCutoff = cutoffH * 60
  const left = minutesCutoff - minutesNow
  if (left <= 0 || left > windowMinutes) return null
  return left
}

// Asia/Dhaka today's date string (YYYY-MM-DD)
export function dhakaToday(): string {
  return dhakaParts().dateStr
}

export function addDaysDhaka(dateStr: string, days: number): string {
  const [year, month, date] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, date))
  d.setUTCDate(d.getUTCDate() + days)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const r = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${r}`
}

export function dhakaTomorrow(): string {
  return addDaysDhaka(dhakaToday(), 1)
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    // Relative paths (like /dashboard) or blob URLs are considered safe
    return url.startsWith('/') || url.startsWith('blob:')
  }
}

