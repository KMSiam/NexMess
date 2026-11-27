import type { TFunction } from 'i18next'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  FileBarChart2,
  Megaphone,
  PiggyBank,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  Utensils,
} from 'lucide-react'
import { supabase } from './supabase'
import type { Notification } from '../types/database'
import { formatCurrency, formatLocalizedDate, isBanglaLang } from './utils'

const LEADING_EMOJI_RE = /^(?:🛒|💰|✅|❌|🔔|📊|👤|⚠️|🍽️|💳|📢|🛡️)\s*/u

const TRUSTED_PUSH_ORIGINS = new Set(['https://www.nexmess.shop', 'https://nexmess.shop'])

export function stripLeadingNotificationEmoji(text: string): string {
  return text.replace(LEADING_EMOJI_RE, '').trim()
}

function formatNotifAmount(raw: string): string {
  const num = Number(raw.replace(/,/g, ''))
  if (Number.isNaN(num)) return `৳ ${raw}`
  return formatCurrency(num)
}

function formatNotifDate(dateStr: string): string {
  if (!isBanglaLang()) return dateStr
  const parsed = formatLocalizedDate(`${dateStr}T12:00:00Z`, 'd MMMM yyyy')
  return parsed || dateStr
}

/**
 * Resolves a safe in-app redirect path for any notification, preferring a valid
 * stored `url` and falling back deterministically by notification `type` / `title`
 * so legacy notifications without `url` also route to the right page and tab.
 */
export function resolveNotificationUrl(
  notification: Pick<Notification, 'type' | 'title'> & { url?: string | null }
): string {
  const rawUrl = notification.url?.trim()
  if (rawUrl) {
    if (/^\/(?!\/)/.test(rawUrl)) {
      return rawUrl.slice(0, 200)
    }
    try {
      const parsed = new URL(rawUrl)
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      if (TRUSTED_PUSH_ORIGINS.has(parsed.origin) || (currentOrigin && parsed.origin === currentOrigin)) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 200) || '/dashboard'
      }
    } catch {
      // Ignore invalid external URLs and fall back by type
    }
  }

  const cleanTitle = stripLeadingNotificationEmoji(notification.title || '').toLowerCase()

  switch (notification.type) {
    case 'bazaar_reminder':
      return cleanTitle.includes('today') ? '/nexmess-ai' : '/market?tab=bazaar'
    case 'bazaar_removed':
      return '/market?tab=bazaar'
    case 'market_reminder':
      return '/nexmess-ai'
    case 'expense_added':
    case 'expense_updated':
    case 'expense_deleted':
      return '/finance?tab=expenses'
    case 'deposit_recorded':
    case 'deposit_verified':
    case 'deposit_deleted':
      return '/finance?tab=deposits'
    case 'fixed_cost_added':
    case 'fixed_cost_paid':
      return '/finance?tab=fixed'
    case 'monthly_report':
      return '/finance?tab=history'
    case 'balance_due':
      return '/finance?tab=summary'
    case 'notice_posted':
      return '/dashboard'
    case 'join_request':
    case 'member_left':
      return '/settings?tab=members'
    case 'join_approved':
      return '/dashboard'
    case 'join_rejected':
      return '/mess/join'
    case 'member_removed':
      return '/dashboard'
    case 'role_changed':
    case 'role_transfer':
      return '/settings?tab=members'
    case 'profile_verified':
      return '/settings?tab=profile'
    case 'meal_updated':
    case 'meal_reminder':
      return '/meals'
    case 'system':
      if (cleanTitle === 'deposit deleted') return '/finance?tab=deposits'
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

export interface NotificationVisualMeta {
  icon: LucideIcon
  bgClass: string
  textClass: string
  destinationKey: string
}

export function getNotificationVisualMeta(
  notification: Pick<Notification, 'type' | 'title'> & { url?: string | null }
): NotificationVisualMeta {
  const cleanTitle = stripLeadingNotificationEmoji(notification.title || '').toLowerCase()

  if (notification.type === 'deposit_deleted' || (notification.type === 'system' && cleanTitle === 'deposit deleted')) {
    return {
      icon: Trash2,
      bgClass: 'bg-nex-danger-light',
      textClass: 'text-nex-danger',
      destinationKey: 'notifications.destinations.deposits',
    }
  }

  switch (notification.type) {
    case 'bazaar_reminder':
      if (cleanTitle.includes('today')) {
        return {
          icon: ShoppingBag,
          bgClass: 'bg-nex-primary-light',
          textClass: 'text-nex-primary-ink',
          destinationKey: 'notifications.destinations.ai',
        }
      }
      return {
        icon: ShoppingBag,
        bgClass: 'bg-nex-primary-light',
        textClass: 'text-nex-primary-ink',
        destinationKey: 'notifications.destinations.market',
      }
    case 'market_reminder':
      return {
        icon: ShoppingBag,
        bgClass: 'bg-nex-primary-light',
        textClass: 'text-nex-primary-ink',
        destinationKey: 'notifications.destinations.ai',
      }
    case 'bazaar_removed':
      return {
        icon: CalendarCheck,
        bgClass: 'bg-nex-warning-light',
        textClass: 'text-nex-warning',
        destinationKey: 'notifications.destinations.market',
      }
    case 'expense_added':
    case 'expense_updated':
      return {
        icon: Receipt,
        bgClass: 'bg-nex-warning-light',
        textClass: 'text-nex-warning',
        destinationKey: 'notifications.destinations.expenses',
      }
    case 'expense_deleted':
      return {
        icon: Trash2,
        bgClass: 'bg-nex-danger-light',
        textClass: 'text-nex-danger',
        destinationKey: 'notifications.destinations.expenses',
      }
    case 'monthly_report':
      return {
        icon: FileBarChart2,
        bgClass: 'bg-nex-secondary-light',
        textClass: 'text-nex-secondary',
        destinationKey: 'notifications.destinations.history',
      }
    case 'member_left':
      return {
        icon: UserMinus,
        bgClass: 'bg-nex-warning-light',
        textClass: 'text-nex-warning',
        destinationKey: 'notifications.destinations.members',
      }
    case 'deposit_recorded':
      return {
        icon: PiggyBank,
        bgClass: 'bg-nex-secondary-light',
        textClass: 'text-nex-secondary',
        destinationKey: 'notifications.destinations.deposits',
      }
    case 'deposit_verified':
      return {
        icon: CheckCircle2,
        bgClass: 'bg-nex-success-light',
        textClass: 'text-nex-success',
        destinationKey: 'notifications.destinations.deposits',
      }
    case 'fixed_cost_added':
    case 'fixed_cost_paid':
      return {
        icon: DollarSign,
        bgClass: 'bg-nex-warning-light',
        textClass: 'text-nex-warning',
        destinationKey: 'notifications.destinations.fixed',
      }
    case 'balance_due':
      return {
        icon: AlertTriangle,
        bgClass: 'bg-nex-danger-light',
        textClass: 'text-nex-danger',
        destinationKey: 'notifications.destinations.summary',
      }
    case 'notice_posted':
      return {
        icon: Megaphone,
        bgClass: 'bg-nex-secondary-light',
        textClass: 'text-nex-secondary',
        destinationKey: 'notifications.destinations.dashboard',
      }
    case 'join_request':
      return {
        icon: UserPlus,
        bgClass: 'bg-nex-warning-light',
        textClass: 'text-nex-warning',
        destinationKey: 'notifications.destinations.members',
      }
    case 'join_approved':
      return {
        icon: UserCheck,
        bgClass: 'bg-nex-success-light',
        textClass: 'text-nex-success',
        destinationKey: 'notifications.destinations.dashboard',
      }
    case 'join_rejected':
      return {
        icon: UserX,
        bgClass: 'bg-nex-danger-light',
        textClass: 'text-nex-danger',
        destinationKey: 'notifications.destinations.join',
      }
    case 'member_removed':
      return {
        icon: UserX,
        bgClass: 'bg-nex-danger-light',
        textClass: 'text-nex-danger',
        destinationKey: 'notifications.destinations.dashboard',
      }
    case 'role_changed':
    case 'role_transfer':
      return {
        icon: ShieldCheck,
        bgClass: 'bg-nex-primary-light',
        textClass: 'text-nex-primary-ink',
        destinationKey: 'notifications.destinations.members',
      }
    case 'profile_verified':
      return {
        icon: ShieldCheck,
        bgClass: 'bg-nex-success-light',
        textClass: 'text-nex-success',
        destinationKey: 'notifications.destinations.profile',
      }
    case 'meal_updated':
    case 'meal_reminder':
      return {
        icon: Utensils,
        bgClass: 'bg-nex-secondary-light',
        textClass: 'text-nex-secondary',
        destinationKey: 'notifications.destinations.meals',
      }
    default:
      return {
        icon: Bell,
        bgClass: 'bg-nex-elevated',
        textClass: 'text-nex-muted',
        destinationKey: 'notifications.destinations.dashboard',
      }
  }
}

/**
 * Localizes database/trigger-generated notifications on the client so existing
 * and server-triggered records dynamically match the active UI language.
 */
export function localizeNotification(
  notification: Pick<Notification, 'type' | 'title' | 'body'> & {
    metadata?: Record<string, unknown> | null
  },
  t: TFunction
): { title: string; body: string | null } {
  const cleanTitle = stripLeadingNotificationEmoji(notification.title || '')
  const body = notification.body?.trim() ?? null
  const meta = (notification.metadata ?? {}) as Record<string, unknown>

  // 1. Bazaar duty assigned (DB trigger: notify_bazaar_assignment)
  if (
    notification.type === 'bazaar_reminder' &&
    cleanTitle.toLowerCase() === 'bazaar duty assigned!'
  ) {
    const match = body?.match(/^You are assigned for bazaar on (\d{4}-\d{2}-\d{2}) in (.+)\.$/)
    return {
      title: t('notifications.items.bazaarAssignedTitle'),
      body: match
        ? t('notifications.items.bazaarAssignedBody', {
            date: formatNotifDate(match[1]),
            mess: match[2],
          })
        : body,
    }
  }

  // 2. Morning bazaar reminder (Edge function: morning-reminder)
  if (
    (notification.type === 'bazaar_reminder' || notification.type === 'market_reminder') &&
    cleanTitle.toLowerCase() === 'bazaar duty today!'
  ) {
    const match = body?.match(
      /^Good morning (.+?)! You're on bazaar duty for (.+?) today\. Check NexMessAI for today's shopping list & prices\.$/
    )
    return {
      title: t('notifications.items.bazaarTodayTitle'),
      body: match
        ? t('notifications.items.bazaarTodayBody', { user: match[1], mess: match[2] })
        : body,
    }
  }

  // 3. New expense added (DB trigger: notify_expense_added)
  if (notification.type === 'expense_added') {
    const titleMatch = cleanTitle.match(/^New expense:\s*৳\s*([\d.,]+)$/i)
    const bodyWithDesc = body?.match(/^(.+?) added an expense:\s*(.+)\.$/)
    const bodyNoDesc = body?.match(/^(.+?) added an expense\.$/)

    const localizedTitle = titleMatch
      ? t('notifications.items.expenseAddedTitle', { amount: formatNotifAmount(titleMatch[1]) })
      : cleanTitle

    const localizedBody = bodyWithDesc
      ? t('notifications.items.expenseAddedBodyWithDesc', {
          user: bodyWithDesc[1],
          desc: bodyWithDesc[2],
        })
      : bodyNoDesc
        ? t('notifications.items.expenseAddedBody', { user: bodyNoDesc[1] })
        : body

    return { title: localizedTitle, body: localizedBody }
  }

  // 4. Deposit recorded (FinancePage)
  if (notification.type === 'deposit_recorded' || cleanTitle === 'Deposit Recorded') {
    const withNote = body?.match(
      /^Your manager recorded a pending deposit of ৳\s*([\d.,]+)\s*\((.+)\)\.$/
    )
    const noNote = body?.match(/^Your manager recorded a pending deposit of ৳\s*([\d.,]+)\.$/)
    return {
      title: t('notifications.items.depositRecordedTitle'),
      body: withNote
        ? t('notifications.items.depositRecordedBodyWithNote', {
            amount: formatNotifAmount(withNote[1]),
            note: withNote[2],
          })
        : noNote
          ? t('notifications.items.depositRecordedBody', {
              amount: formatNotifAmount(noNote[1]),
            })
          : body,
    }
  }

  // 5. Deposit confirmed by member / verified by manager (FinancePage)
  if (notification.type === 'deposit_verified') {
    if (cleanTitle === 'Deposit Confirmed') {
      const match = body?.match(/^(.+?) confirmed the deposit of ৳\s*([\d.,]+)\.$/)
      return {
        title: t('notifications.items.depositConfirmedTitle'),
        body: match
          ? t('notifications.items.depositConfirmedBody', {
              user: match[1],
              amount: formatNotifAmount(match[2]),
            })
          : body,
      }
    }
    if (cleanTitle === 'Deposit Verified') {
      const match = body?.match(/^Your deposit of ৳\s*([\d.,]+) has been verified by the manager\.$/)
      return {
        title: t('notifications.items.depositVerifiedTitle'),
        body: match
          ? t('notifications.items.depositVerifiedBody', { amount: formatNotifAmount(match[1]) })
          : body,
      }
    }
  }

  // 6. Deposit deleted (DB trigger: notify_deposit_deleted)
  if (notification.type === 'deposit_deleted' || cleanTitle === 'Deposit Deleted') {
    const match = body?.match(/^A deposit of ৳\s*([\d.,]+) was deleted by a manager\.$/)
    return {
      title: t('notifications.items.depositDeletedTitle'),
      body: match
        ? t('notifications.items.depositDeletedBody', { amount: formatNotifAmount(match[1]) })
        : body,
    }
  }

  // 7. Fixed cost added / paid (FinancePage)
  if (notification.type === 'fixed_cost_added') {
    const titleMatch = cleanTitle.match(/^New fixed bill:\s*৳\s*([\d.,]+)$/i)
    const bodyMatch = body?.match(/^(.+?) added a fixed bill:\s*(.+)\.$/)
    return {
      title: titleMatch
        ? t('notifications.items.fixedAddedTitle', { amount: formatNotifAmount(titleMatch[1]) })
        : cleanTitle,
      body: bodyMatch
        ? t('notifications.items.fixedAddedBody', { user: bodyMatch[1], label: bodyMatch[2] })
        : body,
    }
  }

  if (notification.type === 'fixed_cost_paid') {
    const match = body?.match(/^Fixed bill \((.+?)\) of ৳\s*([\d.,]+) was marked as paid\.$/)
    return {
      title: t('notifications.items.fixedPaidTitle'),
      body: match
        ? t('notifications.items.fixedPaidBody', {
            label: match[1],
            amount: formatNotifAmount(match[2]),
          })
        : body,
    }
  }

  // 8. Notice posted (DashboardPage)
  if (notification.type === 'notice_posted') {
    const messName =
      typeof meta.mess_name === 'string' && meta.mess_name
        ? meta.mess_name
        : cleanTitle.replace(/^Notice:\s*/i, '')
    return {
      title: messName
        ? t('notifications.items.noticePostedTitle', { mess: messName })
        : t('notifications.items.noticePostedFallbackTitle'),
      body,
    }
  }

  // 9. Join request (DB trigger: notify_join_request)
  if (notification.type === 'join_request' && cleanTitle === 'New join request') {
    const match = body?.match(/^(.+?) wants to join (.+)\.$/)
    return {
      title: t('notifications.items.joinRequestTitle'),
      body: match
        ? t('notifications.items.joinRequestBody', { user: match[1], mess: match[2] })
        : body,
    }
  }

  // 10. Join approved (DB trigger: notify_join_request)
  if (notification.type === 'join_approved' && cleanTitle.startsWith('Request approved!')) {
    const match = body?.match(/^You are now a member of (.+)\.$/)
    return {
      title: t('notifications.items.joinApprovedTitle'),
      body: match ? t('notifications.items.joinApprovedBody', { mess: match[1] }) : body,
    }
  }

  // 11. Join rejected (SettingsPage)
  if (notification.type === 'join_rejected' && cleanTitle === 'Request rejected') {
    const match = body?.match(/^Your request to join (.+?) has been declined\.$/)
    return {
      title: t('notifications.items.joinRejectedTitle'),
      body: match ? t('notifications.items.joinRejectedBody', { mess: match[1] }) : body,
    }
  }

  // 12. Removed from mess (SettingsPage)
  if (notification.type === 'member_removed' && cleanTitle === 'Removed from mess') {
    const match = body?.match(/^You have been removed from (.+?) by the manager\.$/)
    return {
      title: t('notifications.items.memberRemovedTitle'),
      body: match ? t('notifications.items.memberRemovedBody', { mess: match[1] }) : body,
    }
  }

  // 13. Role changed (SettingsPage)
  if (notification.type === 'role_changed' || notification.type === 'role_transfer') {
    if (cleanTitle === 'Promoted to Manager') {
      const match = body?.match(/^You were promoted to manager in (.+)\.$/)
      return {
        title: t('notifications.items.rolePromotedTitle'),
        body: match ? t('notifications.items.rolePromotedBody', { mess: match[1] }) : body,
      }
    }
    if (cleanTitle === 'Role Updated') {
      const match = body?.match(/^Your role in (.+?) was changed to member\.$/)
      return {
        title: t('notifications.items.roleDemotedTitle'),
        body: match ? t('notifications.items.roleDemotedBody', { mess: match[1] }) : body,
      }
    }
  }

  // 14. Profile verification (SettingsPage)
  if (notification.type === 'profile_verified') {
    if (cleanTitle === 'Profile Verified') {
      const match = body?.match(/^A manager verified your profile in (.+)\.$/)
      return {
        title: t('notifications.items.profileVerifiedTitle'),
        body: match ? t('notifications.items.profileVerifiedBody', { mess: match[1] }) : body,
      }
    }
    if (cleanTitle === 'Verification Removed') {
      const match = body?.match(/^A manager removed your verification badge in (.+)\.$/)
      return {
        title: t('notifications.items.profileUnverifiedTitle'),
        body: match ? t('notifications.items.profileUnverifiedBody', { mess: match[1] }) : body,
      }
    }
  }

  // 15. Manager meal override (MealsPage)
  if (notification.type === 'meal_updated') {
    const match = body?.match(/^(.+?) updated your meal record for (\d{4}-\d{2}-\d{2})\.$/)
    return {
      title: t('notifications.items.mealUpdatedTitle'),
      body: match
        ? t('notifications.items.mealUpdatedBody', {
            user: match[1],
            date: formatNotifDate(match[2]),
          })
        : body,
    }
  }

  // 16. Bazaar duty removed (DB trigger: notify_bazaar_removed)
  if (notification.type === 'bazaar_removed') {
    const match = body?.match(
      /^Your bazaar assignment on (\d{4}-\d{2}-\d{2}) in (.+?) was removed\.$/
    )
    return {
      title: t('notifications.items.bazaarRemovedTitle'),
      body: match
        ? t('notifications.items.bazaarRemovedBody', {
            date: formatNotifDate(match[1]),
            mess: match[2],
          })
        : body,
    }
  }

  // 17. Expense updated / deleted by manager (FinancePage)
  if (notification.type === 'expense_updated') {
    const match = body?.match(/^(.+?) updated your expense to ৳\s*([\d.,]+)\.$/)
    return {
      title: t('notifications.items.expenseUpdatedTitle'),
      body: match
        ? t('notifications.items.expenseUpdatedBody', {
            user: match[1],
            amount: formatNotifAmount(match[2]),
          })
        : body,
    }
  }

  if (notification.type === 'expense_deleted') {
    const match = body?.match(/^(.+?) removed your expense of ৳\s*([\d.,]+)\.$/)
    return {
      title: t('notifications.items.expenseDeletedTitle'),
      body: match
        ? t('notifications.items.expenseDeletedBody', {
            user: match[1],
            amount: formatNotifAmount(match[2]),
          })
        : body,
    }
  }

  // 18. Member left mess (SettingsPage)
  if (notification.type === 'member_left') {
    const match = body?.match(/^(.+?) left (.+)\.$/)
    return {
      title: t('notifications.items.memberLeftTitle'),
      body: match
        ? t('notifications.items.memberLeftBody', { user: match[1], mess: match[2] })
        : body,
    }
  }

  // 19. Monthly archive report ready (DB cron: cron_archive_previous_month)
  if (notification.type === 'monthly_report') {
    const match = body?.match(/^Monthly financial archive for (\d{4}-\d{2}) in (.+?) is ready\.$/)
    const formattedMonth = match
      ? formatLocalizedDate(`${match[1]}-01T12:00:00Z`, 'MMMM yyyy') || match[1]
      : null
    return {
      title: t('notifications.items.monthlyReportTitle'),
      body:
        match && formattedMonth
          ? t('notifications.items.monthlyReportBody', {
              month: formattedMonth,
              mess: match[2],
            })
          : body,
    }
  }

  return { title: cleanTitle, body }
}

export interface CreateNotificationInput {
  user_id: string
  mess_id: string | null
  type: string
  title: string
  body: string | null
  url: string
  metadata?: Record<string, unknown>
}

/**
 * Inserts one or more in-app notifications into `public.notifications`, which
 * automatically triggers real-time UI updates and Web Push dispatch via `tr_notifications_send_push`.
 */
export async function createNotifications(
  input: CreateNotificationInput | CreateNotificationInput[]
): Promise<boolean> {
  const rows = Array.isArray(input) ? input : [input]
  if (rows.length === 0) return true

  const payload = rows.map((row) => ({
    user_id: row.user_id,
    mess_id: row.mess_id,
    type: row.type,
    title: row.title,
    body: row.body,
    url: row.url,
    metadata: row.metadata ?? {},
  }))

  const { error } = await supabase.from('notifications').insert(payload)
  if (error) {
    console.error('Failed to insert notifications:', error)
    return false
  }
  return true
}
