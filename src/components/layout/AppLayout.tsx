import { useState, useEffect, Suspense } from 'react'
import { flushSync } from 'react-dom'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import {
  Home,
  Utensils,
  MessageSquare,
  Wallet,
  ShoppingBag,
  Settings,
  LogOut,
  Check,
  PanelLeft,
  PanelLeftClose,
  X,
  MoreHorizontal,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import NotificationBell from '../NotificationBell'
import GlobalErrorBoundary from '../GlobalErrorBoundary'
import { getInitials } from '../../lib/utils'
import logoIcon from '../../assets/logo-icon.svg'

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/meals', icon: Utensils, label: 'Meals' },
  { to: '/market-assistant', icon: Sparkles, label: 'NexMessAI' },
  { to: '/finance', icon: Wallet, label: 'Finance' },
  { to: '/market', icon: ShoppingBag, label: 'Market & Routine' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuthStore()
  const { currentMess, messes, setCurrentMess, fetchUserMesses, reset: resetMess } = useMessStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMessDropdown, setShowMessDropdown] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const sidebarItems = currentMess
    ? [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/meals', icon: Utensils, label: 'Meals' },
        { to: '/market-assistant', icon: Sparkles, label: 'NexMessAI' },
        { to: '/finance', icon: Wallet, label: 'Finance' },
        { to: '/market', icon: ShoppingBag, label: 'Market & Routine' },
        { to: '/chat', icon: MessageSquare, label: 'Chat' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ]
    : [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ]

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('nexmess-theme')
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('nexmess-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('nexmess-theme', 'light')
    }
  }, [isDark])

  // Uses the View Transitions API with CSS custom properties to animate a circular clip-path transition from the click point when toggling themes.
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
    navigate('/', { replace: true })
  }

  // Listen for realtime updates to the user's own membership status (e.g. approval) to refresh mess information.
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel(`user-membership-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mess_members', filter: `user_id=eq.${profile.id}` },
        () => {
          // If status changes (like being approved), refresh the mess list
          fetchUserMesses(profile.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, fetchUserMesses])

  return (
    <div className="bg-nex-bg flex min-h-dvh">
      <aside
        className={`nex-glass border-nex-border/50 sticky top-0 hidden h-screen flex-col border-r transition-all duration-300 md:flex ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div
          className={`border-nex-border/50 flex items-center border-b ${sidebarCollapsed ? 'flex-col gap-2 px-2 py-3' : 'gap-3 px-4 py-4'}`}
        >
          <img src={logoIcon} alt="NexMess" className="rounded-card h-9 w-9 shrink-0" />
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

        <nav className="flex-1 space-y-1 px-3 py-3">
          {sidebarItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `rounded-btn flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'nex-nav-active' : 'nex-nav-inactive'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-nex-border/50 border-t px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(profile?.username || 'U')
                )}
              </div>
              {profile?.is_verified && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white border-2 border-white dark:border-nex-bg shadow-sm" title="Verified Member">
                  <Check className="h-1.5 w-1.5 stroke-[4]" />
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-nex-text flex items-center gap-1.5 truncate text-sm font-medium">
                  {profile?.username || 'User'}
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

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="nex-glass border-nex-border/50 sticky top-0 z-10 border-b px-4 py-3 md:px-6">
          <div className="flex items-center justify-between font-medium">
            <div className="relative">
              {currentMess ? (
                <>
                  <button
                    onClick={() => setShowMessDropdown(!showMessDropdown)}
                    className="bg-nex-elevated hover:bg-nex-hover border-nex-border/50 flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors"
                  >
                    <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 text-xs font-bold text-white">
                      {currentMess.avatar_url ? (
                        <img src={currentMess.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        currentMess.name[0]
                      )}
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
                            <div className="bg-nex-elevated text-nex-muted flex h-5.5 w-5.5 items-center justify-center overflow-hidden rounded text-[10px] font-bold">
                              {mess.avatar_url ? (
                                <img src={mess.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                mess.name[0]
                              )}
                            </div>
                            <span className="truncate">{mess.name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <img src={logoIcon} alt="NexMess" className="h-7 w-7" />
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
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full w-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </GlobalErrorBoundary>
        </main>
      </div>

      <MobileBottomNav
        handleSignOut={handleSignOut}
        signingOut={signingOut}
        hasMess={!!currentMess}
      />
    </div>
  )
}
function MobileBottomNav({
  handleSignOut,
  signingOut,
  hasMess,
}: {
  handleSignOut: () => void
  signingOut: boolean
  hasMess: boolean
}) {
  const [showMore, setShowMore] = useState(false)

  const mainTabs = hasMess
    ? navItems.slice(0, 4) // Dashboard, Meals, Chat, Finance
    : [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ]

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {showMore && (
        <div className="nex-card border-nex-border animate-slide-up safe-area-bottom fixed right-2 bottom-16 left-2 z-30 border p-2 shadow-xl md:hidden">
          <NavLink
            to="/market"
            onClick={() => setShowMore(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`
            }
          >
            <ShoppingBag className="h-5 w-5" /> Market & Routine
          </NavLink>
          <NavLink
            to="/chat"
            onClick={() => setShowMore(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`
            }
          >
            <MessageSquare className="h-5 w-5" /> Chat
          </NavLink>

          <NavLink
            to="/settings"
            onClick={() => setShowMore(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`
            }
          >
            <Settings className="h-5 w-5" /> Settings
          </NavLink>
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

      <nav
        className="nex-glass border-nex-border/50 safe-area-bottom fixed inset-x-0 bottom-0 z-20 border-t md:hidden"
        style={{ transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }}
      >
        <div className="flex items-center justify-around py-1.5">
          {mainTabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors ${
                  isActive ? 'text-nex-primary' : 'text-nex-muted'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
          {hasMess && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors ${showMore ? 'text-nex-primary' : 'text-nex-muted'}`}
            >
              {showMore ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}

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
