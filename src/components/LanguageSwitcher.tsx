import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Check } from 'lucide-react'
import { changeLanguage } from '../lib/i18n'

interface LanguageSwitcherProps {
  className?: string
  variant?: 'pill' | 'select' | 'compact'
}

export default function LanguageSwitcher({
  className = '',
  variant = 'compact',
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = (i18n.language || 'en').startsWith('bn') ? 'bn' : 'en'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = async (lang: 'en' | 'bn') => {
    await changeLanguage(lang)
    setOpen(false)
  }

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center rounded-xl border border-nex-border/80 bg-nex-elevated p-1 shadow-sm ${className}`}
      >
        <button
          type="button"
          onClick={() => handleSelect('en')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            currentLang === 'en'
              ? 'bg-nex-primary text-white shadow-sm'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => handleSelect('bn')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold font-bangla transition-all ${
            currentLang === 'bn'
              ? 'bg-nex-primary text-white shadow-sm'
              : 'text-nex-muted hover:text-nex-text hover:bg-nex-hover'
          }`}
        >
          বাংলা
        </button>
      </div>
    )
  }

  if (variant === 'select') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleSelect('en')}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              currentLang === 'en'
                ? 'border-nex-primary bg-nex-primary/5 dark:bg-nex-primary/10 shadow-sm ring-1 ring-nex-primary'
                : 'border-nex-border bg-nex-surface hover:border-nex-primary/40 hover:bg-nex-hover/40'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-nex-text">English (US)</p>
              <p className="text-xs text-nex-muted mt-0.5">Standard English interface</p>
            </div>
            {currentLang === 'en' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-nex-primary text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('bn')}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left font-bangla transition-all ${
              currentLang === 'bn'
                ? 'border-nex-primary bg-nex-primary/5 dark:bg-nex-primary/10 shadow-sm ring-1 ring-nex-primary'
                : 'border-nex-border bg-nex-surface hover:border-nex-primary/40 hover:bg-nex-hover/40'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-nex-text">বাংলা (Bengali)</p>
              <p className="text-xs text-nex-muted mt-0.5">হিন্দ শিলিগুড়ি মার্জিত ফন্ট</p>
            </div>
            {currentLang === 'bn' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-nex-primary text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Compact Header / Nav mode
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-btn text-nex-muted hover:bg-nex-hover hover:text-nex-text flex items-center gap-1.5 p-2 text-xs font-semibold transition-colors"
        title={t('common.language')}
        aria-label="Change Language"
      >
        <Languages className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline-block font-sans">
          {currentLang === 'bn' ? 'বাং' : 'EN'}
        </span>
      </button>

      {open && (
        <div className="bg-nex-surface border-nex-border animate-slide-up absolute right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-xl border p-1 shadow-xl">
          <button
            type="button"
            onClick={() => handleSelect('en')}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
              currentLang === 'en'
                ? 'bg-nex-primary/10 text-nex-primary font-semibold'
                : 'text-nex-text hover:bg-nex-hover'
            }`}
          >
            <span>English</span>
            {currentLang === 'en' && <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => handleSelect('bn')}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bangla font-medium transition-colors ${
              currentLang === 'bn'
                ? 'bg-nex-primary/10 text-nex-primary font-semibold'
                : 'text-nex-text hover:bg-nex-hover'
            }`}
          >
            <span>বাংলা</span>
            {currentLang === 'bn' && <Check className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
