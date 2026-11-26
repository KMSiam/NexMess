import { describe, it, expect, beforeEach } from 'vitest'
import i18n, { changeLanguage, toBengaliDigits } from '../i18n'
import { formatCurrency, formatNumber, formatLocalizedDate, formatFoodName, mealCutoffLabel } from '../utils'
import en from '../../locales/en.json'
import bn from '../../locales/bn.json'

describe('i18n Localization Engine', () => {
  beforeEach(async () => {
    await changeLanguage('en')
    localStorage.clear()
  })

  it('has identical top-level and nested key schemas for English and Bengali', () => {
    const enKeys = Object.keys(en).sort()
    const bnKeys = Object.keys(bn).sort()
    expect(bnKeys).toEqual(enKeys)

    // Check common keys
    expect(Object.keys(bn.common).sort()).toEqual(Object.keys(en.common).sort())
    // Check nav keys
    expect(Object.keys(bn.nav).sort()).toEqual(Object.keys(en.nav).sort())
    // Check finance keys
    expect(Object.keys(bn.finance.tabs).sort()).toEqual(Object.keys(en.finance.tabs).sort())
    expect(Object.keys(bn.finance.cards).sort()).toEqual(Object.keys(en.finance.cards).sort())
    expect(Object.keys(bn.finance.breakdown).sort()).toEqual(Object.keys(en.finance.breakdown).sort())
    expect(Object.keys(bn.finance.depositModal).sort()).toEqual(
      Object.keys(en.finance.depositModal).sort(),
    )
    expect(Object.keys(bn.finance.expenseModal).sort()).toEqual(
      Object.keys(en.finance.expenseModal).sort(),
    )
    // Check mess & invite keys
    expect(Object.keys(bn.mess.create).sort()).toEqual(Object.keys(en.mess.create).sort())
    expect(Object.keys(bn.mess.invite).sort()).toEqual(Object.keys(en.mess.invite).sort())
    expect(Object.keys(bn.settings.messSection).sort()).toEqual(Object.keys(en.settings.messSection).sort())
  })

  it('correctly provides Bengali translations for key mess terminology', () => {
    expect(bn.common.appName).toBe('নেক্সমেস')
    expect(bn.nav.meals).toBe('মিল হিসাব')
    expect(bn.dashboard.stats.mealRate).toBe('মিল রেট')
    expect(bn.dashboard.stats.messBalance).toBe('মেস তহবিল')
    expect(bn.finance.tabs.settleUp).toBe('লেনদেন নিষ্পত্তি')
  })

  it('switches language and persists to localStorage and document.documentElement', async () => {
    await changeLanguage('bn')
    expect(i18n.language).toBe('bn')
    expect(document.documentElement.lang).toBe('bn')
    expect(localStorage.getItem('nexmess-lang')).toBe('bn')

    await changeLanguage('en')
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('nexmess-lang')).toBe('en')
  })

  it('converts Arabic/English digits to Bengali numerals with toBengaliDigits', () => {
    expect(toBengaliDigits(0)).toBe('০')
    expect(toBengaliDigits(1234567890)).toBe('১২৩৪৫৬৭৮৯০')
    expect(toBengaliDigits('৳ 1,450.50')).toBe('৳ ১,৪৫০.৫০')
    expect(toBengaliDigits('Room 302')).toBe('Room ৩০২')
  })

  it('localizes currency, numbers, dates, and food names when language switches to bn', async () => {
    await changeLanguage('en')
    expect(formatNumber(25)).toBe('25')
    expect(formatCurrency(-200)).toBe('৳ -200')
    expect(mealCutoffLabel('lunch')).toBe('10:00 AM')
    expect(formatFoodName('Chicken')).toBe('Chicken')

    await changeLanguage('bn')
    expect(formatNumber(25)).toBe('২৫')
    expect(formatCurrency(-200)).toBe('৳ -২০০')
    expect(formatCurrency(1450)).toBe('৳ ১,৪৫০')
    expect(mealCutoffLabel('lunch')).toBe('সকাল ১০:০০')
    expect(mealCutoffLabel('dinner')).toBe('বিকাল ৪:০০')
    expect(formatFoodName('Chicken, Egg')).toBe('মুরগি, ডিম')
    expect(formatLocalizedDate('2026-11-25T12:00:00Z', 'MMMM d')).toBe('নভেম্বর ২৫')
  })
})
