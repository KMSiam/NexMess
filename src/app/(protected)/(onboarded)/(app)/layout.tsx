'use client'

import { useState, useEffect, Suspense } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useClerk } from '@clerk/nextjs'
import { useProfileStore, useMessStore } from '@/stores/appStore'
import {
  Home,
  Utensils,
  MessageSquare,
  Wallet,
  ShoppingBag,
  Settings,
  LogOut,
  CheckCircle2,
  PanelLeft,
  PanelLeftClose,
  X,
  MoreHorizontal,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/meals', icon: Utensils, label: 'Meals' },
  { href: '/market-assistant', icon: Sparkles, label: 'NexMessAI' },
  { href: '/finance', icon: Wallet, label: 'Finance' },
  { href: '/market', icon: ShoppingBag, label: 'Market & Routine' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

const getInitials = (name: string) => {
  return name
    .split(/[\s_-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { profile } = useProfileStore()
  const { currentMess, messes, setCurrentMess, reset: resetMess } = useMessStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMessDropdown, setShowMessDropdown] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const sidebarItems = currentMess
    ? navItems
    : [
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/settings', icon: Settings, label: 'Settings' },
      ]

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('nexmess-theme')
    const isDarkTheme = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkTheme)
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('nexmess-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('nexmess-theme', 'light')
    }
  }, [isDark])

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const doc = document as any
    if (!doc.startViewTransition) {
      setIsDark(!isDark)
      return
    }

    const x = e.clientX
    const y = e.clientY

    document.documentElement.style.setProperty('--x', `${x}px`)
    document.documentElement.style.setProperty('--y', `${y}px`)

    doc.startViewTransition(() => {
      flushSync(() => {
        setIsDark((prev) => !prev)
      })
    })
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    resetMess()
    await signOut()
    router.replace('/')
  }

  return (
    <div className="bg-nex-bg flex min-h-dvh">
      {/* ── Desktop Sidebar ────────────────── */}
      <aside
        className={`nex-glass border-nex-border/50 sticky top-0 hidden h-screen flex-col border-r transition-all duration-300 md:flex ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div
          className={`border-nex-border/50 flex items-center border-b ${
            sidebarCollapsed ? 'flex-col gap-2 px-2 py-3' : 'gap-3 px-4 py-4'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="NexMess" className="rounded-card h-9 w-9 shrink-0" />
          {!sidebarCollapsed && (
            <h1 className="text-nex-text flex-1 text-lg font-bold tracking-tight">NexMess</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-btn text-nex-muted hover:bg-nex-hover p-1.5 transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-3">
          {sidebarItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`rounded-btn flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'nex-nav-active' : 'nex-nav-inactive'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-nex-border/50 border-t px-3 py-3">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-semibold text-white relative">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getInitials(profile?.username || 'U')
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-nex-text flex items-center gap-1.5 truncate text-sm font-medium">
                  {profile?.username || 'User'}
                  {profile?.is_verified && (
                    <span className="nex-verified">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </p>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-nex-muted hover:text-nex-danger flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-3 w-3" /> {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ───────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {/* Header */}
        <header className="nex-glass border-nex-border/50 sticky top-0 z-10 border-b px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            {/* Header Mess Selector (Desktop & Mobile) */}
            <div className="relative">
              {currentMess ? (
                <>
                  <button
                    onClick={() => setShowMessDropdown(!showMessDropdown)}
                    className="bg-nex-elevated hover:bg-nex-hover border-nex-border/50 flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors"
                  >
                    <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 text-xs font-bold text-white">
                      {currentMess.name[0]}
                    </div>
                    <div className="min-w-0 pr-1">
                      <p className="text-nex-text max-w-[140px] truncate text-sm leading-tight font-semibold sm:max-w-[200px]">
                        {currentMess.name}
                      </p>
                      <p className="text-nex-muted mt-0.5 font-mono text-[10px] leading-none">
                        {currentMess.unique_code}
                      </p>
                    </div>
                    {messes.length > 1 && (
                      <ChevronDown className="text-nex-muted ml-0.5 h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>

                  {showMessDropdown && messes.length > 1 && (
                    <div className="bg-nex-bg border-nex-border animate-slide-down absolute top-full left-0 z-20 mt-1.5 w-48 space-y-0.5 rounded-xl border p-1 shadow-xl">
                      {messes
                        .filter((m) => m.id !== currentMess.id)
                        .map((mess) => (
                          <button
                            key={mess.id}
                            onClick={() => {
                              setCurrentMess(mess)
                              setShowMessDropdown(false)
                            }}
                            className="hover:bg-nex-hover text-nex-text flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors"
                          >
                            <div className="bg-nex-elevated text-nex-muted flex h-5.5 w-5.5 items-center justify-center rounded text-[10px] font-bold">
                              {mess.name[0]}
                            </div>
                            <span className="truncate">{mess.name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-icon.svg" alt="NexMess" className="h-7 w-7" />
                  <span className="text-nex-text text-sm font-bold">NexMess</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="rounded-btn hover:bg-nex-hover text-nex-muted p-2 transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <GlobalErrorBoundary>
            <Suspense
              fallback={
                <div className="flex h-[50vh] items-center justify-center">
                  <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              }
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full w-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </GlobalErrorBoundary>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ──────────────── */}
      <MobileBottomNav
        handleSignOut={handleSignOut}
        signingOut={signingOut}
        hasMess={!!currentMess}
        pathname={pathname}
      />
    </div>
  )
}

function MobileBottomNav({
  handleSignOut,
  signingOut,
  hasMess,
  pathname,
}: {
  handleSignOut: () => void
  signingOut: boolean
  hasMess: boolean
  pathname: string
}) {
  const [showMore, setShowMore] = useState(false)

  const mainTabs = hasMess
    ? navItems.slice(0, 4) // Dashboard, Meals, Chat, Finance
    : [
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/settings', icon: Settings, label: 'Settings' },
      ]

  return (
    <>
      {/* Overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Menu Popup */}
      {showMore && (
        <div className="nex-card border-nex-border animate-slide-up safe-area-bottom fixed right-2 bottom-16 left-2 z-30 border p-2 shadow-xl md:hidden">
          <Link
            href="/market"
            onClick={() => setShowMore(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
              pathname === '/market'
                ? 'bg-nex-primary-light text-nex-primary font-medium'
                : 'text-nex-text hover:bg-nex-hover'
            }`}
          >
            <ShoppingBag className="h-5 w-5" /> Market & Routine
          </Link>
          <Link
            href="/chat"
            onClick={() => setShowMore(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
              pathname === '/chat'
                ? 'bg-nex-primary-light text-nex-primary font-medium'
                : 'text-nex-text hover:bg-nex-hover'
            }`}
          >
            <MessageSquare className="h-5 w-5" /> Chat
          </Link>

          <Link
            href="/settings"
            onClick={() => setShowMore(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
              pathname === '/settings'
                ? 'bg-nex-primary-light text-nex-primary font-medium'
                : 'text-nex-text hover:bg-nex-hover'
            }`}
          >
            <Settings className="h-5 w-5" /> Settings
          </Link>
          <div className="border-nex-border my-1 border-t" />
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="hover:bg-nex-danger-light flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" /> {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav
        className="nex-glass border-nex-border/50 safe-area-bottom fixed inset-x-0 bottom-0 z-20 border-t md:hidden"
        style={{ transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }}
      >
        <div className="flex items-center justify-around py-1.5">
          {mainTabs.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors ${
                  isActive ? 'text-nex-primary' : 'text-nex-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
          {/* More Button */}
          {hasMess && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors ${
                showMore ? 'text-nex-primary' : 'text-nex-muted'
              }`}
            >
              {showMore ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}

          {/* Sign Out Button for users with no mess */}
          {!hasMess && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-nex-muted flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors hover:text-red-500 disabled:opacity-50"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] font-medium">
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
