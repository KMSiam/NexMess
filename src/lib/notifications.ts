import type { TFunction } from 'i18next'
import type { Notification } from '../types/database'
import { formatCurrency, formatLocalizedDate, isBanglaLang } from './utils'

const LEADING_EMOJI_RE = /^(?:🛒|💰|✅|❌|🔔|📊|👤|⚠️|🍽️|💳)\s*/u

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
 * Localizes database/trigger-generated notifications on the client so existing
 * and server-triggered records dynamically match the active UI language.
 */
export function localizeNotification(
  notification: Pick<Notification, 'type' | 'title' | 'body'>,
  t: TFunction
): { title: string; body: string | null } {
  const cleanTitle = stripLeadingNotificationEmoji(notification.title || '')
  const body = notification.body?.trim() ?? null

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
    notification.type === 'bazaar_reminder' &&
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
  if (cleanTitle === 'Deposit Deleted') {
    const match = body?.match(/^A deposit of ৳\s*([\d.,]+) was deleted by a manager\.$/)
    return {
      title: t('notifications.items.depositDeletedTitle'),
      body: match
        ? t('notifications.items.depositDeletedBody', { amount: formatNotifAmount(match[1]) })
        : body,
    }
  }

  // 7. Join request (DB trigger: notify_join_request)
  if (notification.type === 'join_request' && cleanTitle === 'New join request') {
    const match = body?.match(/^(.+?) wants to join (.+)\.$/)
    return {
      title: t('notifications.items.joinRequestTitle'),
      body: match
        ? t('notifications.items.joinRequestBody', { user: match[1], mess: match[2] })
        : body,
    }
  }

  // 8. Join approved (DB trigger: notify_join_request)
  if (notification.type === 'join_approved' && cleanTitle.startsWith('Request approved!')) {
    const match = body?.match(/^You are now a member of (.+)\.$/)
    return {
      title: t('notifications.items.joinApprovedTitle'),
      body: match ? t('notifications.items.joinApprovedBody', { mess: match[1] }) : body,
    }
  }

  // 9. Join rejected (SettingsPage)
  if (notification.type === 'join_rejected' && cleanTitle === 'Request rejected') {
    const match = body?.match(/^Your request to join (.+?) has been declined\.$/)
    return {
      title: t('notifications.items.joinRejectedTitle'),
      body: match ? t('notifications.items.joinRejectedBody', { mess: match[1] }) : body,
    }
  }

  // 10. Removed from mess (SettingsPage)
  if (notification.type === 'member_removed' && cleanTitle === 'Removed from mess') {
    const match = body?.match(/^You have been removed from (.+?) by the manager\.$/)
    return {
      title: t('notifications.items.memberRemovedTitle'),
      body: match ? t('notifications.items.memberRemovedBody', { mess: match[1] }) : body,
    }
  }

  return { title: cleanTitle, body }
}
