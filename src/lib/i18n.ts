import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '../locales/en.json'
import bn from '../locales/bn.json'

const savedLanguage = localStorage.getItem('nexmess-lang') || 'en'

// Sync html lang attribute immediately
if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLanguage
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'bn'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'nexmess-lang',
      caches: ['localStorage'],
    },
  })

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
    localStorage.setItem('nexmess-lang', lng)
  }
})

export const changeLanguage = async (lng: 'en' | 'bn') => {
  await i18n.changeLanguage(lng)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
    localStorage.setItem('nexmess-lang', lng)
  }
}

/**
 * Converts English digits (0-9) to Bengali numerals (০-৯)
 */
export const toBengaliDigits = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(num).replace(/[0-9]/g, (w) => bnDigits[+w])
}

export default i18n
