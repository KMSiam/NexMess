import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { bn } from 'date-fns/locale/bn'
import i18n, { toBengaliDigits } from './i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isBanglaLang(): boolean {
  return (i18n.language || 'en').startsWith('bn')
}

export function formatNumber(val: number | string): string {
  const str = String(val)
  return isBanglaLang() ? toBengaliDigits(str) : str
}

export function formatLocalizedDate(date: Date | string | number, pattern: string): string {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const isBn = isBanglaLang()
  const out = format(d, pattern, isBn ? { locale: bn } : undefined)
  return isBn ? toBengaliDigits(out) : out
}

export function formatLocalizedDistance(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const isBn = isBanglaLang()
  const out = formatDistanceToNow(d, { addSuffix: true, ...(isBn ? { locale: bn } : {}) })
  return isBn ? toBengaliDigits(out) : out
}

const FOOD_BN_MAP: Record<string, string> = {
  chicken: 'মুরগি',
  fish: 'মাছ',
  egg: 'ডিম',
  eggs: 'ডিম',
  vegetables: 'সবজি',
  veg: 'সবজি',
  beef: 'গরুর মাংস',
  mutton: 'খাসির মাংস',
  dal: 'ডাল',
  lentil: 'ডাল',
  shrimp: 'চিংড়ি',
  rice: 'ভাত',
  khichuri: 'খিচুড়ি',
  biryani: 'বিরিয়ানি',
  polao: 'পোলাও',
  potato: 'আলু',
}

export function formatFoodName(name: string): string {
  if (!name || !isBanglaLang()) return name
  return name
    .split(',')
    .map((part) => {
      const trimmed = part.trim()
      const mapped = FOOD_BN_MAP[trimmed.toLowerCase()]
      return mapped || trimmed
    })
    .join(', ')
}

export function generateMessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const randomBytes = new Uint8Array(6)
  crypto.getRandomValues(randomBytes)
  let code = 'NEX-'
  for (let i = 0; i < randomBytes.length; i++) {
    code += chars[randomBytes[i] % chars.length]
  }
  return code
}

export function isApprovedManager(
  members: Array<{ user_id: string; role: string; status: string }>,
  userId?: string | null
): boolean {
  if (!userId) return false
  return members.some((m) => m.user_id === userId && m.role === 'manager' && m.status === 'approved')
}

export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const str = `৳ ${formatted}`
  return isBanglaLang() ? toBengaliDigits(str) : str
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
  if (hour < 12) return i18n.t('dashboard.greetingMorning')
  if (hour < 15) return i18n.t('dashboard.greetingNoon')
  if (hour < 18) return i18n.t('dashboard.greetingAfternoon')
  return i18n.t('dashboard.greetingEvening')
}

// Meal cut-off times (Asia/Dhaka). After cut-off, today's meal cannot be toggled.
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
  if (dateStr < todayDhaka) return true
  if (dateStr > todayDhaka) return false

  const { hour } = dhakaParts()
  return hour >= MEAL_CUTOFF_HOURS[type]
}

export function mealCutoffLabel(type: 'lunch' | 'dinner'): string {
  if (isBanglaLang()) {
    return type === 'lunch' ? 'সকাল ১০:০০' : 'বিকাল ৪:০০'
  }
  return type === 'lunch' ? '10:00 AM' : '4:00 PM'
}

export function mealCutoffApproaching(type: 'lunch' | 'dinner', windowMinutes = 60): number | null {
  const { hour, minute } = dhakaParts()
  const cutoffH = MEAL_CUTOFF_HOURS[type]
  const minutesNow = hour * 60 + minute
  const minutesCutoff = cutoffH * 60
  const left = minutesCutoff - minutesNow
  if (left <= 0 || left > windowMinutes) return null
  return left
}

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

/**
 * Returns day_of_week index (0=Saturday, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday)
 * for a date string formatted as "YYYY-MM-DD" (defaults to dhakaToday()).
 */
export function getMealRoutineDow(dateStr: string = dhakaToday()): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return (d.getUTCDay() + 1) % 7
}

export function isSafeHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (isSafeHttpUrl(trimmed)) return true
  // Allow only single-leading-slash relative paths (block protocol-relative //evil.com and blob:/data:/javascript:)
  return /^\/(?!\/)/.test(trimmed)
}

