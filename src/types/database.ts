import type { FixedCostCategory } from '../lib/spending'

export type { FixedCostCategory }

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  is_verified: boolean
  contact_no: string | null
  updated_at: string
  verification_doc_type?: 'nid' | 'birth_certificate' | 'other' | null
  verification_doc_no?: string | null
  verification_doc_url?: string | null
  emergency_contact_no?: string | null
  deleted_at?: string | null
}

export interface Mess {
  id: string
  name: string
  unique_code: string
  manager_id: string | null
  public_info: Record<string, unknown>
  max_members: number
  is_active: boolean
  location?: string | null
  rules_and_info?: string | null
  avatar_url?: string | null
  created_at: string
}

export interface MessMember {
  mess_id: string
  user_id: string
  status: 'pending' | 'approved' | 'left'
  role: 'member' | 'manager'
  joined_at: string
  left_at?: string | null
  profiles?: Profile
}

export interface Meal {
  id: string
  user_id: string
  mess_id: string
  date: string
  lunch: boolean
  dinner: boolean
  guest_lunch: number
  guest_dinner: number
}

export interface Expense {
  id: string
  mess_id: string
  amount: number
  category: string | null
  description: string | null
  expense_type: 'bazaar' | 'fixed' | 'other'
  receipt_url: string | null
  date: string
  created_by: string | null
  created_at: string
  profiles?: Profile
}

export interface Deposit {
  id: string
  mess_id: string
  user_id: string
  amount: number
  verified: boolean
  verified_by: string | null
  date: string
  note: string | null
  created_at: string
  profiles?: Profile
}

export interface FixedCost {
  id: string
  mess_id: string
  category: FixedCostCategory
  label: string | null
  amount: number
  month: string
  is_paid: boolean
  created_by: string | null
  created_at: string
}

export interface MarketSchedule {
  id: string
  mess_id: string
  user_id: string
  assigned_date: string
  profiles?: Profile
}

export interface ChatMessage {
  id: string
  mess_id: string
  sender_id: string
  text: string
  message_type: 'text' | 'image' | 'system'
  created_at: string
  profiles?: Profile
}

export interface Notification {
  id: string
  user_id: string
  mess_id: string | null
  type: string
  title: string
  body: string | null
  url: string | null
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
  updated_at: string
}

export interface MemberBalance {
  meal_rate: number
  personal_meals: number
  individual_cost: number
  total_deposits: number
  balance: number
  fixed_share: number
}
