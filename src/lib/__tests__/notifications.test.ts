import { describe, it, expect, beforeEach } from 'vitest'
import i18n, { changeLanguage } from '../i18n'
import {
  getNotificationVisualMeta,
  localizeNotification,
  resolveNotificationUrl,
} from '../notifications'

describe('Notification Localization', () => {
  beforeEach(async () => {
    await changeLanguage('en')
  })

  it('localizes bazaar duty assigned notifications in English and Bengali', async () => {
    const item = {
      type: 'bazaar_reminder',
      title: '🛒 Bazaar duty assigned!',
      body: 'You are assigned for bazaar on 2026-11-28 in BachelorPoint.',
    }

    expect(localizeNotification(item, i18n.t)).toEqual({
      title: 'Bazaar duty assigned!',
      body: 'You are assigned for bazaar on 2026-11-28 in BachelorPoint.',
    })

    await changeLanguage('bn')
    expect(localizeNotification(item, i18n.t)).toEqual({
      title: 'বাজারের দায়িত্ব নির্ধারিত হয়েছে!',
      body: 'BachelorPoint মেসে আগামী ২৮ নভেম্বর ২০২৬ তারিখে আপনার বাজার করার দায়িত্ব দেওয়া হয়েছে।',
    })
  })

  it('localizes morning bazaar reminders and expenses with Bengali amounts', async () => {
    const morning = {
      type: 'bazaar_reminder',
      title: '🛒 Bazaar Duty Today!',
      body: "Good morning Siam! You're on bazaar duty for BachelorPoint today. Check NexMessAI for today's shopping list & prices.",
    }
    const expense = {
      type: 'expense_added',
      title: '💰 New expense: ৳1450.00',
      body: 'Siam added an expense: Rice & Oil.',
    }

    await changeLanguage('bn')
    expect(localizeNotification(morning, i18n.t)).toEqual({
      title: 'আজ আপনার বাজারের পালা!',
      body: 'সুপ্রভাত Siam! আজ BachelorPoint মেসের বাজারের দায়িত্ব আপনার। আজকের বাজারের তালিকা ও দাম দেখতে নেক্সমেস এআই দেখুন।',
    })
    expect(localizeNotification(expense, i18n.t)).toEqual({
      title: 'নতুন খরচ: ৳ ১,৪৫০',
      body: 'Siam একটি খরচ যোগ করেছেন: Rice & Oil।',
    })
  })

  it('localizes deposit lifecycle and membership notifications', async () => {
    await changeLanguage('bn')

    expect(
      localizeNotification(
        {
          type: 'deposit_recorded',
          title: '💰 Deposit Recorded',
          body: 'Your manager recorded a pending deposit of ৳2000 (bKash).',
        },
        i18n.t
      )
    ).toEqual({
      title: 'জমা রেকর্ড করা হয়েছে',
      body: 'আপনার ম্যানেজার ৳ ২,০০০ টাকার একটি পেন্ডিং জমা রেকর্ড করেছেন (bKash)।',
    })

    expect(
      localizeNotification(
        {
          type: 'deposit_verified',
          title: '✅ Deposit Verified',
          body: 'Your deposit of ৳500 has been verified by the manager.',
        },
        i18n.t
      )
    ).toEqual({
      title: 'জমা যাচাই সম্পন্ন হয়েছে',
      body: 'ম্যানেজার আপনার ৳ ৫০০ টাকার জমা যাচাই করে অনুমোদন করেছেন।',
    })

    expect(
      localizeNotification(
        {
          type: 'system',
          title: 'Deposit Deleted',
          body: 'A deposit of ৳300 was deleted by a manager.',
        },
        i18n.t
      )
    ).toEqual({
      title: 'জমা মুছে ফেলা হয়েছে',
      body: 'ম্যানেজার ৳ ৩০০ টাকার একটি জমা মুছে ফেলেছেন।',
    })

    expect(
      localizeNotification(
        {
          type: 'join_approved',
          title: 'Request approved! 🎉',
          body: 'You are now a member of BachelorPoint.',
        },
        i18n.t
      )
    ).toEqual({
      title: 'অনুরোধ অনুমোদিত হয়েছে! 🎉',
      body: 'আপনি এখন BachelorPoint মেসের একজন সদস্য।',
    })
  })

  it('localizes notices, fixed bills, role updates, verification, and meal overrides', async () => {
    const notice = {
      type: 'notice_posted',
      title: '📢 BachelorPoint',
      body: 'Gas bill due tomorrow.',
      metadata: { mess_name: 'BachelorPoint' },
    }
    const fixedPaid = {
      type: 'fixed_cost_paid',
      title: '✅ Fixed Bill Paid',
      body: 'Fixed bill (WiFi) of ৳1200 was marked as paid.',
    }
    const roleChanged = {
      type: 'role_changed',
      title: '🛡️ Promoted to Manager',
      body: 'You were promoted to manager in BachelorPoint.',
    }
    const mealUpdated = {
      type: 'meal_updated',
      title: '🍽️ Meal Record Updated',
      body: 'Siam updated your meal record for 2026-11-28.',
    }

    expect(localizeNotification(notice, i18n.t)).toEqual({
      title: 'Notice · BachelorPoint',
      body: 'Gas bill due tomorrow.',
    })
    expect(localizeNotification(fixedPaid, i18n.t)).toEqual({
      title: 'Fixed Bill Paid',
      body: 'Fixed bill (WiFi) of ৳ 1,200 was marked as paid.',
    })
    expect(localizeNotification(roleChanged, i18n.t)).toEqual({
      title: 'Promoted to Manager',
      body: 'You were promoted to manager in BachelorPoint.',
    })

    await changeLanguage('bn')
    expect(localizeNotification(notice, i18n.t)).toEqual({
      title: 'নোটিশ · BachelorPoint',
      body: 'Gas bill due tomorrow.',
    })
    expect(localizeNotification(mealUpdated, i18n.t)).toEqual({
      title: 'মিলের হিসাব আপডেট হয়েছে',
      body: 'Siam ২৮ নভেম্বর ২০২৬ তারিখের আপনার মিলের হিসাব আপডেট করেছেন।',
    })
  })

  it('localizes selective high-signal notifications (bazaar removed, expense edits, member left, monthly report)', async () => {
    const bazaarRemoved = {
      type: 'bazaar_removed',
      title: 'Bazaar duty removed',
      body: 'Your bazaar assignment on 2026-11-29 in BachelorPoint was removed.',
    }
    const expenseUpdated = {
      type: 'expense_updated',
      title: 'Expense Updated',
      body: 'Siam updated your expense to ৳750.',
    }
    const expenseDeleted = {
      type: 'expense_deleted',
      title: 'Expense Removed',
      body: 'Siam removed your expense of ৳320.',
    }
    const memberLeft = {
      type: 'member_left',
      title: 'Member Left Mess',
      body: 'Rafi left BachelorPoint.',
    }
    const monthlyReport = {
      type: 'monthly_report',
      title: 'Monthly report ready',
      body: 'Monthly financial archive for 2026-10 in BachelorPoint is ready.',
    }

    expect(localizeNotification(bazaarRemoved, i18n.t)).toEqual({
      title: 'Bazaar duty removed',
      body: 'Your bazaar assignment on 2026-11-29 in BachelorPoint was removed.',
    })
    expect(localizeNotification(monthlyReport, i18n.t)).toEqual({
      title: 'Monthly Report Ready',
      body: 'Monthly financial archive for October 2026 in BachelorPoint is ready.',
    })

    await changeLanguage('bn')
    expect(localizeNotification(bazaarRemoved, i18n.t)).toEqual({
      title: 'বাজারের দায়িত্ব বাতিল হয়েছে',
      body: 'BachelorPoint মেসে আগামী ২৯ নভেম্বর ২০২৬ তারিখের আপনার বাজারের দায়িত্ব বাতিল করা হয়েছে।',
    })
    expect(localizeNotification(expenseUpdated, i18n.t)).toEqual({
      title: 'খরচ আপডেট করা হয়েছে',
      body: 'Siam আপনার যোগ করা খরচটি পরিবর্তন করে ৳ ৭৫০ করেছেন।',
    })
    expect(localizeNotification(expenseDeleted, i18n.t)).toEqual({
      title: 'খরচ মুছে ফেলা হয়েছে',
      body: 'Siam আপনার ৳ ৩২০ টাকার খরচটি মুছে ফেলেছেন।',
    })
    expect(localizeNotification(memberLeft, i18n.t)).toEqual({
      title: 'সদস্য মেস ছেড়েছেন',
      body: 'Rafi BachelorPoint মেস ছেড়ে চলে গেছেন।',
    })
  })

  it('gracefully strips leading emojis on unknown notification types', async () => {
    await changeLanguage('bn')
    expect(
      localizeNotification(
        {
          type: 'system',
          title: '🔔 Custom maintenance alert',
          body: 'Scheduled tonight.',
        },
        i18n.t
      )
    ).toEqual({
      title: 'Custom maintenance alert',
      body: 'Scheduled tonight.',
    })
  })
})

describe('Notification Routing & Visual Metadata', () => {
  it('prefers valid stored relative or trusted origin URLs and rejects unsafe URLs', () => {
    expect(
      resolveNotificationUrl({
        type: 'expense_added',
        title: 'New expense',
        url: '/finance?tab=expenses',
      })
    ).toBe('/finance?tab=expenses')

    expect(
      resolveNotificationUrl({
        type: 'bazaar_reminder',
        title: 'Bazaar Duty Today!',
        url: 'https://www.nexmess.shop/nexmess-ai',
      })
    ).toBe('/nexmess-ai')

    expect(
      resolveNotificationUrl({
        type: 'expense_added',
        title: 'New expense',
        url: '//evil.com/phish',
      })
    ).toBe('/finance?tab=expenses')

    expect(
      resolveNotificationUrl({
        type: 'join_request',
        title: 'New join request',
        url: 'javascript:alert(1)',
      })
    ).toBe('/settings?tab=members')
  })

  it('infers exact page and tab routes for legacy notifications without url', () => {
    expect(
      resolveNotificationUrl({
        type: 'bazaar_reminder',
        title: '🛒 Bazaar duty assigned!',
        url: null,
      })
    ).toBe('/market?tab=bazaar')

    expect(
      resolveNotificationUrl({
        type: 'bazaar_reminder',
        title: '🛒 Bazaar Duty Today!',
        url: null,
      })
    ).toBe('/nexmess-ai')

    expect(
      resolveNotificationUrl({
        type: 'deposit_recorded',
        title: '💰 Deposit Recorded',
        url: null,
      })
    ).toBe('/finance?tab=deposits')

    expect(
      resolveNotificationUrl({
        type: 'system',
        title: 'Deposit Deleted',
        url: null,
      })
    ).toBe('/finance?tab=deposits')

    expect(
      resolveNotificationUrl({
        type: 'fixed_cost_added',
        title: 'New fixed bill',
        url: null,
      })
    ).toBe('/finance?tab=fixed')

    expect(
      resolveNotificationUrl({
        type: 'join_rejected',
        title: 'Request rejected',
        url: null,
      })
    ).toBe('/mess/join')

    expect(
      resolveNotificationUrl({
        type: 'profile_verified',
        title: 'Profile Verified',
        url: null,
      })
    ).toBe('/settings?tab=profile')

    expect(
      resolveNotificationUrl({
        type: 'bazaar_removed',
        title: 'Bazaar duty removed',
        url: null,
      })
    ).toBe('/market?tab=bazaar')

    expect(
      resolveNotificationUrl({
        type: 'expense_deleted',
        title: 'Expense Removed',
        url: null,
      })
    ).toBe('/finance?tab=expenses')

    expect(
      resolveNotificationUrl({
        type: 'member_left',
        title: 'Member Left Mess',
        url: null,
      })
    ).toBe('/settings?tab=members')

    expect(
      resolveNotificationUrl({
        type: 'monthly_report',
        title: 'Monthly report ready',
        url: null,
      })
    ).toBe('/finance?tab=history')
  })

  it('maps visual metadata with semantic theme tokens and destination keys', () => {
    const expenseMeta = getNotificationVisualMeta({
      type: 'expense_added',
      title: 'New expense',
    })
    expect(expenseMeta.destinationKey).toBe('notifications.destinations.expenses')
    expect(expenseMeta.bgClass).toBe('bg-nex-warning-light')

    const depositMeta = getNotificationVisualMeta({
      type: 'deposit_verified',
      title: 'Deposit Verified',
    })
    expect(depositMeta.destinationKey).toBe('notifications.destinations.deposits')
    expect(depositMeta.bgClass).toBe('bg-nex-success-light')
  })
})
