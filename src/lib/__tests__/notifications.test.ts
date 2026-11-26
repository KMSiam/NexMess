import { describe, it, expect, beforeEach } from 'vitest'
import i18n, { changeLanguage } from '../i18n'
import { localizeNotification } from '../notifications'

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
