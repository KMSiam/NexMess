import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Wallet,
  ShoppingBag,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  MessageCircle,
} from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import { useSEO } from '../../hooks/useSEO'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { formatNumber } from '../../lib/utils'
import { APP_VERSION } from '../../lib/version'
import SupportModal from '../../components/SupportModal'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import HeroDashboardPreview from './components/HeroDashboardPreview'

const ROOMMATE_CHIPS = [
  {
    initial: 'S',
    bgClass:
      'bg-slate-200/90 text-slate-700 border-white dark:bg-slate-700 dark:text-slate-100 dark:border-nex-bg',
  },
  {
    initial: 'A',
    bgClass:
      'bg-emerald-200/90 text-emerald-800 border-white dark:bg-emerald-800 dark:text-emerald-100 dark:border-nex-bg',
  },
  {
    initial: 'R',
    bgClass:
      'bg-amber-200/90 text-amber-800 border-white dark:bg-amber-800 dark:text-amber-100 dark:border-nex-bg',
  },
]

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')
  const { isDark, toggleTheme } = useThemeStore()

  useSEO({
    title: isBangla
      ? 'নেক্সমেস — ব্যাচেলর ও মেস ব্যবস্থাপনার আধুনিক স্মার্ট সমাধান'
      : 'NexMess — Smart Mess Management for Shared Living',
    description: isBangla
      ? 'দৈনিক মিল হিসাব, বাজার খরচ বণ্টন, মেম্বারদের জমার খাতা এবং রুমমেটদের সাথে মেস পরিচালনা করার আধুনিক ও নির্ভরযোগ্য প্ল্যাটফর্ম।'
      : 'NexMess is a next-generation real-time mess manager. Track daily meals, split shared expenses, schedule bazaar duties, and coordinate with roommates.',
    keywords:
      'nexmess, nex mess, nexmess app, nex-mess, nexmess.shop, nexmessai, nex-mess ai, nexmess hostel manager, mess management system, mess management app, mess management software, online mess management system, mess management system website, student mess management system, e mess management system, best smart mess management system, cloud based mess management software, web based mess management tool, offline ready mess tracker app, digital mess manager online, smart mess app for bachelors, canteen management system, mess billing software, mess coordinator app, meal tracking app, daily meal tracking app for mess, meal count tracker with cut-off timer, roommate meal counter app, best meal tracking app, best app to track meals, best app for tracking meals, best free meal tracking app, best free food tracking app, free meal tracker app, free meal tracker, meal calculation app, daily meal logging system, hostel meal tracker, automated meal rate calculator, hostel management system, hostel management software, hostel management app, online hostel management system, hostel management system website, student hostel management system, e hostel management system, hostel dining manager, shared living manager, hostel roommate bill split app, shared living management software, flat manager app for students, shared apartment manager app, paying guest management software, pg management app, roommate expense splitter app, flatmate expense tracker online, bachelor mess management app, shared kitchen budget app, utility bill splitter for roommates, mess deposit and expense tracker, rent splitter app, roommate bill split app, roommate expense splitter, flatmate bill split, group expense tracker, monthly recurring expense ledger, custom expense splitting, bill splitting app for roommates, splitwise alternative for roommates, flatmate rent calculator, bazaar cost manager app, automated mess bazaar schedule, rmess bazaar duty rotation tracker, bazar duty schedule, bazar rotation calculator, bazaar list organizer, mess grocery tracker, shared cooking duty roster, মেস ম্যানেজার, মেসের হিসাব, মিল হিসাবের এপ, মিল ম্যানেজার, মেস ম্যানেজার মিল ক্যালকুলেটর, ব্যাচেলর মেস হিসাব খাতা, স্টুডেন্ট হোস্টেল মিল ট্র্যাকার, সহজে মেসের হিসাব, ব্যাচেলর মেস, মেস লাইফ, মেসের বাজার খরচ, টো লেট, ব্যাচেলর টো-লেট, মিল রেট ক্যালকুলেটর',
    canonical: 'https://www.nexmess.shop/',
    robots: 'index, follow',
  })

  const { user, initialized } = useAuthStore()
  const navigate = useNavigate()
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  useEffect(() => {
    if (initialized && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, initialized, navigate])

  const features = [
    {
      title: isBangla ? 'মিল খাতা ও ক্যালেন্ডার' : 'Meal Calendar',
      desc: isBangla
        ? 'মাসিক ক্যালেন্ডারে দুপুর ও রাতের মিল চালু বা বন্ধ করুন। নির্ধারিত কাট-অফ টাইমে স্বয়ংক্রিয় লক।'
        : 'Toggle daily Lunch/Dinner counts in a monthly grid layout. Features strict cut-off timers to lock menu planning.',
      icon: Calendar,
      iconClass: 'bg-blue-500/10 text-blue-600 border-blue-500/15 dark:text-blue-400',
    },
    {
      title: isBangla ? 'মেসের হিসাব-নিকাশ' : 'Finance Tracker',
      desc: isBangla
        ? 'বাজার খরচ ও মেম্বারদের জমা রেকর্ড। স্বয়ংক্রিয় মিল রেট ক্যালকুলেশন ও সহজ লেনদেন নিষ্পত্তি।'
        : 'Log deposits and bazaar expenses. Auto-calculates individual meal rates, utility splits, and settlement transfers.',
      icon: Wallet,
      iconClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15 dark:text-emerald-400',
    },
    {
      title: isBangla ? 'বাজারের শিডিউল' : 'Bazaar Scheduler',
      desc: isBangla
        ? 'সাপ্তাহিক বাজার করার দায়িত্ব বণ্টন। মেম্বারদের মধ্যে স্বয়ংক্রিয় রোটেশন ও রিমাইন্ডার।'
        : 'Schedule market duties. Auto-rotates duty assignments across roommates on a weekly schedule.',
      icon: ShoppingBag,
      iconClass: 'bg-amber-500/10 text-amber-600 border-amber-500/15 dark:text-amber-400',
    },
    {
      title: isBangla ? 'মেস গ্রুপ চ্যাট' : 'Group Chat',
      desc: isBangla
        ? 'মেসের সবার সাথে যোগাযোগ, ভাউচার/মেমোর ছবি শেয়ার, রিঅ্যাকশন এবং নোটিশ ঘোষণা।'
        : 'Integrated messaging workspace with inline image sharing, reactions, and automated status logs.',
      icon: MessageSquare,
      iconClass: 'bg-purple-500/10 text-purple-600 border-purple-500/15 dark:text-purple-400',
    },
    {
      title: isBangla ? 'নেক্সমেস এআই' : 'NexMessAI',
      desc: isBangla
        ? 'দৈনিক বাজার দর যাচাই, রান্নার রেসিপি পরিকল্পনা এবং বাজেট অপ্টিমাইজেশনের স্মার্ট এআই সহকারী।'
        : 'Integrated smart AI assistant for automated grocery lists, location-aware market deals, smart pricing forecasts, and diet feedback.',
      icon: Sparkles,
      iconClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/15 dark:text-indigo-400',
      pulse: true,
    },
  ]

  return (
    <div
      className={`bg-nex-bg text-nex-text flex min-h-screen flex-col overflow-x-clip select-none ${
        isBangla ? 'font-bangla' : 'font-sans'
      }`}
    >
      {/* Sticky Top Header */}
      <header className="nex-glass border-nex-border/60 sticky top-0 z-40 border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-8 lg:px-12">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-85">
            <img src={logoIcon} alt="NexMess" className="h-8 w-8 rounded-lg" />
            <span className="text-nex-text text-base font-extrabold tracking-tight whitespace-nowrap sm:text-lg">
              {isBangla ? t('common.appName') : 'NexMess'}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <LanguageSwitcher />

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-btn hover:bg-nex-hover text-nex-muted hover:text-nex-text relative flex h-9 w-9 cursor-pointer items-center justify-center transition-colors active:scale-95"
              title={isDark ? t('common.light') : t('common.dark')}
              aria-label={t('settings.theme.toggle')}
            >
              <Sun
                className={`h-5 w-5 text-amber-400 transition-all duration-300 ${
                  isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
                }`}
              />
              <Moon
                className={`absolute h-5 w-5 transition-all duration-300 ${
                  isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                }`}
              />
            </button>

            <Link
              to="/login"
              className="border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover hidden shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors sm:inline-flex"
            >
              {isBangla ? 'লগইন' : 'Sign In'}
            </Link>
            <Link
              to="/register"
              className="nex-btn-primary shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap shadow-xs sm:px-4"
            >
              {isBangla ? 'শুরু করুন' : 'Get Started'}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with subtle sage-emerald ambient wash */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#F4F7F4] via-[#FAF5F0] to-[#EDF4EF] dark:from-[#0E1310] dark:via-[#0C0C0D] dark:to-[#101813]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10"
          />

          <div className="relative mx-auto flex min-h-[78dvh] w-full max-w-7xl flex-col items-center justify-center gap-10 px-5 py-12 sm:px-8 lg:flex-row lg:gap-14 lg:px-12 lg:py-16">
            {/* Left Copy */}
            <div className="max-w-xl flex-1 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 dark:border-emerald-400/25 dark:bg-emerald-500/10">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)]" />
                <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                  {isBangla
                    ? `ভার্সন ${formatNumber(APP_VERSION)} লাইভ`
                    : `Version ${APP_VERSION} Live`}
                </span>
              </div>

              <h1 className="text-nex-text text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-[3.4rem]">
                {isBangla ? 'মেস ও ব্যাচেলর জীবনের ' : 'Smart Mess Management for '}
                <span className="text-[#16794C] dark:text-emerald-400">
                  {isBangla ? 'স্মার্ট ডিজিটাল সমাধান' : 'Shared Living'}
                </span>
              </h1>

              <p className="text-nex-muted mx-auto max-w-lg text-sm leading-relaxed sm:text-lg lg:mx-0">
                {isBangla
                  ? 'দৈনিক মিল হিসাব, বাজার খরচ বণ্টন, মেম্বারদের জমার খাতা এবং রুমমেটদের সাথে মেস পরিচালনা করার আধুনিক ও নির্ভরযোগ্য প্ল্যাটফর্ম। পরিচ্ছন্ন বাংলা ও অফলাইন সুবিধা সহ।'
                  : 'Track daily meals, split shared expenses, schedule bazaar duties, and connect with your roommates in real-time. Beautifully designed, fully offline-ready, and mobile-friendly mess management app.'}
              </p>

              <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row sm:gap-4 lg:justify-start">
                <Link
                  to="/register"
                  className="nex-btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-[0_8px_20px_-6px_rgba(47,75,57,0.45)] sm:w-auto"
                >
                  <span>{isBangla ? 'নতুন মেস খুলুন' : 'Create a Mess'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="border-nex-border bg-nex-surface text-nex-text hover:bg-nex-hover flex w-full items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-semibold shadow-xs transition-colors sm:w-auto"
                >
                  {isBangla ? 'মেসে যোগ দিন' : 'Join Existing Mess'}
                </Link>
              </div>

              {/* Roommate Avatars & Audience Strip */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 lg:justify-start">
                <div className="flex -space-x-2" aria-hidden="true">
                  {ROOMMATE_CHIPS.map((chip) => (
                    <span
                      key={chip.initial}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-2xs ${chip.bgClass}`}
                    >
                      {chip.initial}
                    </span>
                  ))}
                </div>
                <p className="text-nex-muted text-xs font-medium">
                  {isBangla
                    ? 'ব্যাচেলর মেস, স্টুডেন্ট হোস্টেল ও শেয়ার্ড ফ্ল্যাটের জন্য তৈরি'
                    : 'Built for bachelor messes, student hostels & shared living'}
                </p>
              </div>
            </div>

            {/* Right Interactive Preview */}
            <HeroDashboardPreview isBangla={isBangla} />
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-nex-surface border-nex-border/80 border-y py-16 sm:py-24">
          <div className="mx-auto max-w-7xl space-y-12 px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-xl space-y-3 text-center">
              <h2 className="text-nex-text text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                {isBangla ? 'মেস পরিচালনার শক্তিশালী সুবিধাসমূহ' : 'Features Built for Messy Groups'}
              </h2>
              <p className="text-nex-muted text-sm sm:text-base">
                {isBangla
                  ? 'বাজার খরচ বণ্টন, মিল কাউন্ট, রুটিন এবং মেম্বারদের সাথে স্বচ্ছ যোগাযোগ এক জায়গায়।'
                  : 'Coordinate and automate meal tracking, kitchen budgeting, bazaar duties, and roommate communication.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="bg-nex-bg/75 border-nex-border hover:border-nex-primary/30 flex flex-col space-y-4 rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-nex-elevated/70"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${feature.iconClass}`}
                    >
                      <Icon className={`h-5 w-5 ${feature.pulse ? 'animate-pulse' : ''}`} />
                    </div>
                    <h3 className="text-nex-text text-base font-bold">{feature.title}</h3>
                    <p className="text-nex-muted flex-1 text-xs leading-relaxed sm:text-[13px]">
                      {feature.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* About Section for SEO */}
        <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-nex-text mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {isBangla ? 'নেক্সমেস সম্পর্কে' : 'About NexMess'}
          </h2>
          <p className="text-nex-muted mx-auto max-w-2xl text-sm leading-relaxed sm:text-base">
            {isBangla ? (
              <>
                <strong>নেক্সমেস (NexMess)</strong> একটি হালকা ও আধুনিক ক্লাউড-ভিত্তিক স্মার্ট মেস
                ম্যানেজমেন্ট সিস্টেম — যা ব্যাচেলর, স্টুডেন্ট হোস্টেল এবং শেয়ার্ড অ্যাপার্টমেন্টের
                দৈনিক মিল গণনা, বাজার ও ফিক্সড খরচ বণ্টন এবং মাসিক হিসাব-নিকাশ সম্পূর্ণ স্বচ্ছ ও সহজ
                করে তোলে।
              </>
            ) : (
              <>
                NexMess (also referred to as <strong>Nex Mess</strong>) is a lightweight, cloud-based
                Smart Mess Management System designed to streamline daily meal counting, automated
                hostel dining logistics, and monthly grocery/bazaar expense distribution for roommates,
                shared student apartments, and bachelors.
              </>
            )}
          </p>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isBangla
                ? 'Supabase RLS এবং Google OAuth দ্বারা সুরক্ষিত'
                : 'Secured with Supabase RLS & Google OAuth'}
            </span>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="text-nex-muted border-nex-border/80 bg-nex-surface/70 mt-auto border-t px-5 pt-6 pb-24 text-xs sm:px-8 sm:py-6 sm:pr-24 lg:pl-12 2xl:pr-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span>
            {isBangla
              ? `© ${formatNumber(new Date().getFullYear())} নেক্সমেস। সর্বস্বত্ব সংরক্ষিত।`
              : `© ${new Date().getFullYear()} NexMess. All rights reserved.`}
          </span>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/privacy-policy" className="hover:text-nex-text transition-colors">
              {isBangla ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </Link>
            <Link to="/terms-of-service" className="hover:text-nex-text transition-colors">
              {isBangla ? 'শর্তাবলী' : 'Terms of Service'}
            </Link>
            <Link to="/faq" className="hover:text-nex-text transition-colors">
              {isBangla ? 'সাধারণ প্রশ্ন (FAQ)' : 'FAQ'}
            </Link>
            <a href="mailto:support@nexmess.shop" className="hover:text-nex-text transition-colors">
              {isBangla ? 'সাপোর্ট ও যোগাযোগ' : 'Contact Support'}
            </a>
          </div>
        </div>
      </footer>

      {/* Support / Contact Floating Button */}
      <button
        type="button"
        onClick={() => setIsSupportOpen(true)}
        className="bg-nex-primary-dark hover:bg-[#2a4032] shadow-nex-primary/30 group fixed right-6 bottom-6 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 dark:bg-nex-primary dark:hover:bg-nex-primary-dark"
        aria-label={t('support.title')}
      >
        <MessageCircle className="h-6 w-6 group-hover:animate-pulse" />
      </button>

      {/* Support Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  )
}
