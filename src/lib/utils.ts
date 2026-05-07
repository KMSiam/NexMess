import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateMessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'NEX-'
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function formatCurrency(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
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
  if (lower.includes('biryani') || lower.includes('বিরিয়ানি') || lower.includes('polao')) return '🍲'
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
