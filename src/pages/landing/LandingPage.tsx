import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Wallet,
  ShoppingBag,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import { useSEO } from '../../hooks/useSEO'
import { useAuthStore } from '../../stores/authStore'
import pkg from '../../../package.json'
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import SupportModal from '../../components/SupportModal'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const { i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')
  useSEO({
    title: 'NexMess — Smart Mess Management for Shared Living',
    description: 'NexMess is a next-generation real-time mess manager. Track daily meals, split shared expenses, schedule bazaar duties, and coordinate with roommates.',
    keywords: 'nexmess, nex mess, nexmess app, nex-mess, nexmess.shop, nexmessai, nex-mess ai, nexmess hostel manager, mess management system, mess management app, mess management software, online mess management system, mess management system website, student mess management system, e mess management system, best smart mess management system, cloud based mess management software, web based mess management tool, offline ready mess tracker app, digital mess manager online, smart mess app for bachelors, canteen management system, mess billing software, mess coordinator app, meal tracking app, daily meal tracking app for mess, meal count tracker with cut-off timer, roommate meal counter app, best meal tracking app, best app to track meals, best app for tracking meals, best free meal tracking app, best free food tracking app, free meal tracker app, free meal tracker, meal calculation app, daily meal logging system, hostel meal tracker, automated meal rate calculator, hostel management system, hostel management software, hostel management app, online hostel management system, hostel management system website, student hostel management system, e hostel management system, hostel dining manager, shared living manager, hostel roommate bill split app, shared living management software, flat manager app for students, shared apartment manager app, paying guest management software, pg management app, roommate expense splitter app, flatmate expense tracker online, bachelor mess management app, shared kitchen budget app, utility bill splitter for roommates, mess deposit and expense tracker, rent splitter app, roommate bill split app, roommate expense splitter, flatmate bill split, group expense tracker, monthly recurring expense ledger, custom expense splitting, bill splitting app for roommates, splitwise alternative for roommates, flatmate rent calculator, bazaar cost manager app, automated mess bazaar schedule, rmess bazaar duty rotation tracker, bazar duty schedule, bazar rotation calculator, bazaar list organizer, mess grocery tracker, shared cooking duty roster, মেস ম্যানেজার, মেসের হিসাব, মিল হিসাবের এপ, মিল ম্যানেজার, মেস ম্যানেজার মিল ক্যালকুলেটর, ব্যাচেলর মেস হিসাব খাতা, স্টুডেন্ট হোস্টেল মিল ট্র্যাকার, সহজে মেসের হিসাব, ব্যাচেলর মেস, মেস লাইফ, মেসের বাজার খরচ, টো লেট, ব্যাচেলর টো-লেট, মিল রেট ক্যালকুলেটর, mess management system github, hostel management system github, github hostel management system, github mess management system, mess management system project github, canteen management system project github, college canteen management system project github, react mess management github',
    canonical: 'https://www.nexmess.shop/',
    robots: 'index, follow',
  })
  const { user, initialized } = useAuthStore()
  const navigate = useNavigate()
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [lunchActive, setLunchActive] = useState(true)
  const [dinnerActive, setDinnerActive] = useState(false)
  const [lunchGuests, setLunchGuests] = useState(0)
  const [dinnerGuests, setDinnerGuests] = useState(0)
  const [activities] = useState([
    { id: 1, text: 'Siam added ৳1,450.00 bazaar cost', time: '10m ago', type: 'expense' },
    { id: 2, text: 'Abir added ৳2,000.00 deposit', time: '1h ago', type: 'deposit' },
    { id: 3, text: 'Siam added ৳320.00 utility fixed cost', time: '3h ago', type: 'expense' },
  ])

  const toggleLunch = () => {
    setLunchActive((prev) => !prev)
  }

  const toggleDinner = () => {
    setDinnerActive((prev) => !prev)
  }

  const updateLunchGuests = (delta: number) => {
    setLunchGuests((prev) => Math.max(0, prev + delta))
  }

  const updateDinnerGuests = (delta: number) => {
    setDinnerGuests((prev) => Math.max(0, prev + delta))
  }

  // Live recalculating metrics in Bangladeshi Taka (৳) to match your real system
  const pastMeals = 16.5
  const mealsToday = (lunchActive ? 1 : 0) + lunchGuests
  const mealsTonight = (dinnerActive ? 1 : 0) + dinnerGuests
  const totalMeals = pastMeals + mealsToday + mealsTonight
  const mealRate = 75
  const deposit = 1800
  const fixedCosts = 280
  const totalCost = totalMeals * mealRate + fixedCosts
  const balance = deposit - totalCost
  const messTotalSpent = 6450

  useEffect(() => {
    if (initialized && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, initialized, navigate])

  return (
    <div className="bg-nex-bg text-nex-text flex min-h-screen flex-col overflow-x-hidden font-sans select-none">
      {/* Header / Nav */}
      <header className="nex-glass border-nex-border/50 sticky top-0 z-40 flex w-full items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="NexMess" className="h-8 w-8 rounded-lg" />
          <span className="text-nex-text text-lg font-bold tracking-tight">NexMess</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher variant="pill" />
          <Link to="/login" className="nex-btn-secondary px-3.5 py-2 text-xs font-semibold">
            {isBangla ? 'লগইন' : 'Sign In'}
          </Link>
          <Link to="/register" className="nex-btn-primary px-3.5 py-2 text-xs font-semibold">
            {isBangla ? 'শুরু করুন' : 'Get Started'}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto flex min-h-[85dvh] w-full max-w-7xl flex-col items-center justify-center gap-12 px-6 py-12 sm:px-12 lg:min-h-[80vh] lg:flex-row">
        {/* Left copy */}
        <div className="max-w-xl flex-1 space-y-6 text-center lg:text-left">
          <div className="bg-nex-primary-light border-nex-primary/10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
            <Zap className="text-nex-primary h-3.5 w-3.5" />
            <span className="text-nex-primary text-xs font-bold tracking-wide uppercase">
              Version {pkg.version} Live
            </span>
          </div>
          <h1 className="text-nex-text text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl sm:leading-none lg:text-6xl">
            {isBangla ? 'মেস ও ব্যাচেলর জীবনের ' : 'Smart Mess Management for '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {isBangla ? 'স্মার্ট ডিজিটাল সমাধান' : 'Shared Living'}
            </span>
          </h1>
          <p className="text-nex-muted text-base leading-relaxed sm:text-lg">
            {isBangla
              ? 'দৈনিক মিল হিসাব, বাজার খরচ বণ্টন, মেম্বারদের জমার খাতা এবং রুমমেটদের সাথে মেস পরিচালনা করার আধুনিক ও নির্ভরযোগ্য প্ল্যাটফর্ম। পরিচ্ছন্ন বাংলা ও অফলাইন সুবিধা সহ।'
              : 'Track daily meals, split shared expenses, schedule bazaar duties, and connect with your roommates in real-time. Beautifully designed, fully offline-ready, and mobile-friendly mess management app.'}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Link
              to="/register"
              className="nex-btn-primary flex w-full items-center justify-center gap-2 px-6 py-3 font-semibold sm:w-auto"
            >
              {isBangla ? 'নতুন মেস খুলুন' : 'Create a Mess'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="nex-btn-secondary flex w-full items-center justify-center px-6 py-3 font-semibold sm:w-auto"
            >
              {isBangla ? 'মেসে যোগ দিন' : 'Join Existing Mess'}
            </Link>
          </div>
        </div>

        {/* Right illustration / graphic - Interactive Mockup Dashboard */}
        <div className="flex w-full max-w-md flex-1 justify-center lg:max-w-none">
          <div className="border-nex-border relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-nex-surface/80 p-5 shadow-2xl backdrop-blur-md">
            {/* Window Controls */}
            <div className="border-nex-border mb-4 flex items-center justify-between border-b pb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-nex-muted font-mono">nexmess.shop/dashboard</span>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                <span className="text-emerald-500 text-[10px] font-bold">LIVE</span>
              </div>
            </div>

            {/* Real Stats Grid Preview */}
            <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
              <div className="rounded-xl border border-nex-border bg-nex-surface p-3 text-center shadow-sm">
                <p className="text-nex-muted text-[9px] font-medium tracking-wider uppercase">
                  {isBangla ? 'আমার মিল' : 'My Meals'}
                </p>
                <motion.p
                  key={totalMeals}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-nex-text mt-0.5 text-sm font-bold"
                >
                  {totalMeals.toFixed(1)}
                </motion.p>
              </div>
              <div className="rounded-xl border border-nex-border bg-nex-surface p-3 text-center shadow-sm">
                <p className="text-nex-muted text-[9px] font-medium tracking-wider uppercase">
                  {isBangla ? 'ব্যালেন্স' : 'Balance'}
                </p>
                <motion.p
                  key={balance}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className={`mt-0.5 text-sm font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  ৳ {balance.toFixed(0)}
                </motion.p>
              </div>
              <div className="rounded-xl border border-nex-border bg-nex-surface p-3 text-center shadow-sm">
                <p className="text-nex-muted text-[9px] font-medium tracking-wider uppercase">
                  {isBangla ? 'মিল রেট' : 'Meal Rate'}
                </p>
                <p className="text-nex-text mt-0.5 text-sm font-bold">৳ {mealRate}</p>
              </div>
              <div className="rounded-xl border border-nex-border bg-nex-surface p-3 text-center shadow-sm">
                <p className="text-nex-muted text-[9px] font-medium tracking-wider uppercase">
                  {isBangla ? 'মেসের খরচ' : 'Mess Spent'}
                </p>
                <p className="text-amber-600 mt-0.5 text-sm font-bold">৳ {messTotalSpent}</p>
              </div>
            </div>

            {/* Meal Selector Preview */}
            <div className="rounded-xl border border-nex-border bg-nex-bg/50 p-4">
              <div className="mb-3.5 flex items-center justify-between">
                <h4 className="text-nex-text text-xs font-semibold uppercase tracking-wider">
                  {isBangla ? 'আমার মিল' : 'My Meals'}
                </h4>
                <div className="bg-nex-border/50 rounded-md flex p-0.5">
                  <span className="bg-white text-nex-text rounded px-2 py-0.5 text-[10px] font-semibold shadow-xs">
                    {isBangla ? 'আজ' : 'Today'}
                  </span>
                  <span className="text-nex-muted rounded px-2 py-0.5 text-[10px] font-medium opacity-60">
                    {isBangla ? 'আগামীকাল' : 'Tomorrow'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Lunch Box */}
                <div
                  className={`flex flex-col rounded-lg border p-3.5 transition-colors duration-200 ${lunchActive || lunchGuests > 0
                    ? 'bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/10'
                    : 'bg-nex-surface border-nex-border'
                    }`}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☀️</span>
                      <div>
                        <p className="text-nex-text text-[11px] font-semibold">
                          {isBangla ? 'দুপুর' : 'Lunch'}
                        </p>
                        <p
                          className={`text-[9px] font-medium ${lunchActive ? 'text-emerald-600 font-bold' : 'text-nex-muted'
                            }`}
                        >
                          {isBangla ? (lunchActive ? 'খাচ্ছি' : 'বন্ধ') : (lunchActive ? 'Eating' : 'Skipping')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleLunch}
                      className={`relative h-6 w-10 rounded-full transition-colors duration-200 flex items-center p-0.5 ${lunchActive ? 'bg-emerald-500 justify-end' : 'bg-nex-border justify-start'
                        }`}
                    >
                      <motion.span
                        layout
                        className="h-4.5 w-4.5 rounded-full bg-white shadow-sm"
                        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100/50 pt-2.5">
                    <p className="text-[10px] font-medium text-slate-500">
                      {isBangla ? 'মেহমান' : 'Guests'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateLunchGuests(-1)}
                        disabled={lunchGuests === 0}
                        className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-5 w-5 items-center justify-center rounded border disabled:opacity-50 text-[10px] font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-3 text-center text-[11px] font-semibold">{lunchGuests}</span>
                      <button
                        onClick={() => updateLunchGuests(1)}
                        className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dinner Box */}
                <div
                  className={`flex flex-col rounded-lg border p-3.5 transition-colors duration-200 ${dinnerActive || dinnerGuests > 0
                    ? 'bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/10'
                    : 'bg-nex-surface border-nex-border'
                    }`}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌙</span>
                      <div>
                        <p className="text-nex-text text-[11px] font-semibold">
                          {isBangla ? 'রাত' : 'Dinner'}
                        </p>
                        <p
                          className={`text-[9px] font-medium ${dinnerActive ? 'text-emerald-600 font-bold' : 'text-nex-muted'
                            }`}
                        >
                          {isBangla ? (dinnerActive ? 'খাচ্ছি' : 'বন্ধ') : (dinnerActive ? 'Eating' : 'Skipping')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleDinner}
                      className={`relative h-6 w-10 rounded-full transition-colors duration-200 flex items-center p-0.5 ${dinnerActive ? 'bg-emerald-500 justify-end' : 'bg-nex-border justify-start'
                        }`}
                    >
                      <motion.span
                        layout
                        className="h-4.5 w-4.5 rounded-full bg-white shadow-sm"
                        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100/50 pt-2.5">
                    <p className="text-[10px] font-medium text-slate-500">
                      {isBangla ? 'মেহমান' : 'Guests'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateDinnerGuests(-1)}
                        disabled={dinnerGuests === 0}
                        className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-5 w-5 items-center justify-center rounded border disabled:opacity-50 text-[10px] font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-3 text-center text-[11px] font-semibold">{dinnerGuests}</span>
                      <button
                        onClick={() => updateDinnerGuests(1)}
                        className="bg-nex-surface border-nex-border text-nex-muted hover:bg-nex-hover flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Activity Log */}
            <div className="mt-4 rounded-xl border border-nex-border p-4 bg-nex-bg/20">
              <h4 className="text-nex-text text-[10px] font-bold uppercase tracking-wider mb-2">
                {isBangla ? 'সাম্প্রতিক কার্যক্রম' : 'Recent Activity'}
              </h4>
              <div className="flex flex-col gap-2 min-h-[90px]">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-2 rounded-lg border border-nex-border/50 bg-nex-surface px-3 py-1.5 text-[11px] shadow-xs"
                  >
                    <div
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${act.type === 'deposit' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-nex-text">{act.text}</span>
                      <span className="text-[9px] text-nex-muted">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-nex-surface border-nex-border border-y py-20">
        <div className="mx-auto max-w-7xl space-y-12 px-6 sm:px-12">
          <div className="mx-auto max-w-xl space-y-3 text-center">
            <h2 className="text-nex-text text-3xl font-extrabold tracking-tight">
              {isBangla ? 'মেস পরিচালনার শক্তিশালী সুবিধাসমূহ' : 'Features Built for messy groups'}
            </h2>
            <p className="text-nex-muted text-sm">
              {isBangla
                ? 'বাজার খরচ বণ্টন, মিল কাউন্ট, রুটিন এবং মেম্বারদের সাথে স্বচ্ছ যোগাযোগ এক জায়গায়।'
                : 'Coordinate and automate all house chores, kitchen budgeting, and roommates communications.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">
                {isBangla ? 'মিল খাতা ও ক্যালেন্ডার' : 'Meal Calendar'}
              </h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                {isBangla
                  ? 'মাসিক ক্যালেন্ডারে দুপুর ও রাতের মিল চালু বা বন্ধ করুন। নির্ধারিত কাট-অফ টাইমে স্বয়ংক্রিয় লক।'
                  : 'Toggle daily Lunch/Dinner counts in a monthly grid layout. Features strict cut-off timers to lock menu planning.'}
              </p>
            </div>

            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">
                {isBangla ? 'মেসের হিসাব-নিকাশ' : 'Finance Tracker'}
              </h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                {isBangla
                  ? 'বাজার খরচ ও মেম্বারদের জমা রেকর্ড। স্বয়ংক্রিয় মিল রেট ক্যালকুলেশন ও সহজ লেনদেন নিষ্পত্তি।'
                  : 'Log deposits and bazaar expenses. Auto-calculates individual meal rates, utility splits, and settlement transfers.'}
              </p>
            </div>

            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">
                {isBangla ? 'বাজারের শিডিউল' : 'Bazaar Scheduler'}
              </h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                {isBangla
                  ? 'সাপ্তাহিক বাজার করার দায়িত্ব বণ্টন। মেম্বারদের মধ্যে স্বয়ংক্রিয় রোটেশন ও রিমাইন্ডার।'
                  : 'Schedule market duties. Auto-rotates duty assignments across roommates on a weekly schedule.'}
              </p>
            </div>

            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">
                {isBangla ? 'মেস গ্রুপ চ্যাট' : 'Group Chat'}
              </h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                {isBangla
                  ? 'মেসের সবার সাথে যোগাযোগ, ভাউচার/মেমোর ছবি শেয়ার, রিঅ্যাকশন এবং নোটিশ ঘোষণা।'
                  : 'Integrated messaging workspace with inline image sharing, reactions, and automated status logs.'}
              </p>
            </div>

            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <h3 className="text-nex-text font-bold">
                {isBangla ? 'নেক্সমেস এআই' : 'NexMessAI'}
              </h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                {isBangla
                  ? 'দৈনিক বাজার দর যাচাই, রান্নার রেসিপি পরিকল্পনা এবং বাজেট অপ্টিমাইজেশনের স্মার্ট এআই সহকারী।'
                  : 'Integrated smart AI assistant for automated grocery lists, location-aware market deals, smart pricing forecasts, and diet feedback.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section for SEO */}
      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <h2 className="text-nex-text mb-3 text-lg font-bold">About NexMess</h2>
        <p className="text-nex-muted mx-auto max-w-2xl text-xs leading-relaxed">
          NexMess (also referred to as <strong>Nex Mess</strong>) is a lightweight, cloud-based Smart
          Mess Management System designed to streamline daily meal counting, automated hostel dining
          logistics, and monthly grocery/bazaar expense distribution for roommates, shared student
          apartments, and bachelors.
        </p>
      </section>

      {/* Footer */}
      <footer className="text-nex-muted border-nex-border/50 mt-auto border-t px-6 py-8 text-center text-xs">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          <ShieldCheck className="text-nex-success h-4 w-4" />
          <span>Secured with Supabase RLS & Google OAuth</span>
        </div>
        <div className="mt-2 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <span>&copy; {new Date().getFullYear()} NexMess Inc. All rights reserved.</span>
          <span className="text-nex-border/50 hidden sm:inline">|</span>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/privacy-policy" className="hover:text-nex-text transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-nex-text transition-colors">
              Terms of Service
            </Link>
            <Link to="/faq" className="hover:text-nex-text transition-colors">
              FAQ
            </Link>
            <a href="mailto:support@nexmess.shop" className="hover:text-nex-text transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </footer>

      {/* Support / Contact Floating Button */}
      <button
        onClick={() => setIsSupportOpen(true)}
        className="bg-nex-primary shadow-nex-primary/30 group fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Support and Contact"
      >
        <MessageCircle className="h-6 w-6 group-hover:animate-pulse" />
      </button>

      {/* Support Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  )
}
