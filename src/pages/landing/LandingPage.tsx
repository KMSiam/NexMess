import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Wallet, ShoppingBag, MessageSquare, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import logoIcon from '../../assets/logo-icon.svg'
import heroImg from '../../assets/hero.png'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuthStore } from '../../stores/authStore'
import { useEffect } from 'react'

export default function LandingPage() {
  usePageTitle('Smart Mess Management')
  const { user, initialized } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (initialized && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, initialized, navigate])

  return (
    <div className="min-h-screen bg-nex-bg text-nex-text flex flex-col font-sans select-none overflow-x-hidden">
      {/* Header / Nav */}
      <header className="sticky top-0 z-40 w-full nex-glass border-b border-nex-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="NexMess" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-bold text-nex-text tracking-tight">NexMess</span>
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
      <section className="relative flex flex-col lg:flex-row items-center justify-center min-h-[85dvh] lg:min-h-[80vh] max-w-7xl mx-auto px-6 sm:px-12 py-12 gap-12 w-full">
        {/* Left copy */}
        <div className="flex-1 space-y-6 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-nex-primary-light rounded-full border border-nex-primary/10">
            <Zap className="w-3.5 h-3.5 text-nex-primary" />
            <span className="text-xs font-bold text-nex-primary uppercase tracking-wide">Version 1.0 Live</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-nex-text leading-tight sm:leading-none">
            Smart Mess Management for <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Shared Living</span>
          </h1>
          <p className="text-base sm:text-lg text-nex-muted leading-relaxed">
            Track daily meals, split shared expenses, schedule bazaar duties, and connect with your roommates in real-time. Beautifully designed, fully offline-ready, and mobile-friendly mess management app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link to="/register" className="nex-btn-primary w-full sm:w-auto px-6 py-3 font-semibold flex items-center justify-center gap-2">
              Create a Mess <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="nex-btn-secondary w-full sm:w-auto px-6 py-3 font-semibold flex items-center justify-center">
              Join Existing Mess
            </Link>
          </div>
        </div>

        {/* Right illustration / graphic */}
        <div className="flex-1 flex justify-center w-full max-w-md lg:max-w-none">
          <div className="relative w-full max-w-lg aspect-square rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-nex-border flex items-center justify-center p-6 shadow-xl animate-pulse-soft">
            <img src={heroImg} alt="NexMess Mockup" className="w-4/5 h-auto object-contain rounded-2xl shadow-lg border border-nex-border" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-nex-surface py-20 border-y border-nex-border">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-nex-text">Features Built for messy groups</h2>
            <p className="text-sm text-nex-muted">Coordinate and automate all house chores, kitchen budgeting, and roommates communications.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="nex-card p-6 space-y-3 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-nex-text">Meal Calendar</h3>
              <p className="text-xs text-nex-muted leading-relaxed flex-1">
                Toggle daily Lunch/Dinner counts in a monthly grid layout. Features strict cut-off timers to lock menu planning.
              </p>
            </div>

            <div className="nex-card p-6 space-y-3 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-nex-text">Finance Tracker</h3>
              <p className="text-xs text-nex-muted leading-relaxed flex-1">
                Log deposits and bazaar expenses. Auto-calculates individual meal rates, utility splits, and settlement transfers.
              </p>
            </div>

            <div className="nex-card p-6 space-y-3 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-nex-text">Bazaar Scheduler</h3>
              <p className="text-xs text-nex-muted leading-relaxed flex-1">
                Schedule market duties. Auto-rotates duty assignments across roommates on a weekly schedule.
              </p>
            </div>

            <div className="nex-card p-6 space-y-3 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-nex-text">Group Chat</h3>
              <p className="text-xs text-nex-muted leading-relaxed flex-1">
                Integrated messaging workspace with inline image sharing, reactions, and automated status logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-xs text-nex-muted mt-auto border-t border-nex-border/50">
        <div className="flex justify-center items-center gap-1.5 mb-2">
          <ShieldCheck className="w-4 h-4 text-nex-success" />
          <span>Secured with Supabase RLS & Google OAuth</span>
        </div>
        <div>&copy; {new Date().getFullYear()} NexMess Inc. All rights reserved.</div>
      </footer>
    </div>
  )
}
