import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Wallet,
  ShoppingBag,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import heroImg from '../../assets/hero.png'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuthStore } from '../../stores/authStore'
import pkg from '../../../package.json'
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import SupportModal from '../../components/SupportModal'

export default function LandingPage() {
  usePageTitle('Smart Mess Management')
  const { user, initialized } = useAuthStore()
  const navigate = useNavigate()
  const [isSupportOpen, setIsSupportOpen] = useState(false)

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
        <div className="flex items-center gap-3">
          <Link to="/login" className="nex-btn-secondary px-4 py-2 text-xs font-semibold">
            Sign In
          </Link>
          <Link to="/register" className="nex-btn-primary px-4 py-2 text-xs font-semibold">
            Get Started
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
            Smart Mess Management for{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Shared Living
            </span>
          </h1>
          <p className="text-nex-muted text-base leading-relaxed sm:text-lg">
            Track daily meals, split shared expenses, schedule bazaar duties, and connect with your
            roommates in real-time. Beautifully designed, fully offline-ready, and mobile-friendly
            mess management app.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Link
              to="/register"
              className="nex-btn-primary flex w-full items-center justify-center gap-2 px-6 py-3 font-semibold sm:w-auto"
            >
              Create a Mess <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="nex-btn-secondary flex w-full items-center justify-center px-6 py-3 font-semibold sm:w-auto"
            >
              Join Existing Mess
            </Link>
          </div>
        </div>

        {/* Right illustration / graphic */}
        <div className="flex w-full max-w-md flex-1 justify-center lg:max-w-none">
          <div className="border-nex-border animate-pulse-soft relative flex aspect-square w-full max-w-lg items-center justify-center rounded-3xl border bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6 shadow-xl">
            <img
              src={heroImg}
              alt="NexMess Mockup"
              className="border-nex-border h-auto w-4/5 rounded-2xl border object-contain shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-nex-surface border-nex-border border-y py-20">
        <div className="mx-auto max-w-7xl space-y-12 px-6 sm:px-12">
          <div className="mx-auto max-w-xl space-y-3 text-center">
            <h2 className="text-nex-text text-3xl font-extrabold tracking-tight">
              Features Built for messy groups
            </h2>
            <p className="text-nex-muted text-sm">
              Coordinate and automate all house chores, kitchen budgeting, and roommates
              communications.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">Meal Calendar</h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                Toggle daily Lunch/Dinner counts in a monthly grid layout. Features strict cut-off
                timers to lock menu planning.
              </p>
            </div>

            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">Finance Tracker</h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                Log deposits and bazaar expenses. Auto-calculates individual meal rates, utility
                splits, and settlement transfers.
              </p>
            </div>

            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">Bazaar Scheduler</h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                Schedule market duties. Auto-rotates duty assignments across roommates on a weekly
                schedule.
              </p>
            </div>

            <div className="nex-card flex flex-col space-y-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-nex-text font-bold">Group Chat</h3>
              <p className="text-nex-muted flex-1 text-xs leading-relaxed">
                Integrated messaging workspace with inline image sharing, reactions, and automated
                status logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section for SEO */}
      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <h2 className="text-nex-text mb-3 text-lg font-bold">About NexMess (NesMess)</h2>
        <p className="text-nex-muted mx-auto max-w-2xl text-xs leading-relaxed">
          NexMess (also referred to as <strong>NesMess</strong> or <strong>Nex Mess</strong>) is a
          lightweight, cloud-based Smart Mess Management System designed to streamline daily meal
          counting, automated hostel dining logistics, and monthly grocery/bazaar expense
          distribution for roommates, shared student apartments, and bachelors.
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
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-nex-text transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-nex-text transition-colors">
              Terms of Service
            </Link>
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
