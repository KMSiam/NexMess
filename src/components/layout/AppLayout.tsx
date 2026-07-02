import { useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import {
  Home, Utensils, MessageSquare, Wallet, ShoppingBag,
  Settings, LogOut, CheckCircle2,
  CalendarClock, PanelLeft, PanelLeftClose, X, MoreHorizontal,
  Sun, Moon, History, ChevronDown
} from 'lucide-react'
import NotificationBell from '../NotificationBell'
import GlobalErrorBoundary from '../GlobalErrorBoundary'
import { getInitials } from '../../lib/utils'
import logoIcon from '../../assets/logo-icon.svg'

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/meals', icon: Utensils, label: 'Meals' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/finance', icon: Wallet, label: 'Finance' },
  { to: '/market', icon: ShoppingBag, label: 'Market' },
  { to: '/routine', icon: CalendarClock, label: 'Routine' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, user, signOut } = useAuthStore()
  const { currentMess, messes, members, setCurrentMess, fetchUserMesses, reset: resetMess } = useMessStore()
  const isManager = members.some(m => m.user_id === user?.id && m.role === 'manager')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMessDropdown, setShowMessDropdown] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const sidebarItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/meals', icon: Utensils, label: 'Meals' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/finance', icon: Wallet, label: 'Finance' },
    { to: '/market', icon: ShoppingBag, label: 'Market' },
    { to: '/routine', icon: CalendarClock, label: 'Routine' },
    ...(isManager ? [{ to: '/history', icon: History, label: 'History' }] : []),
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
        setIsDark(prev => !prev)
      })
    })
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    resetMess()
    await signOut()
    navigate('/login', { replace: true })
  }

  // ─────────────────────────────────────────────
  // GLOBAL MEMBERSHIP LISTENER
  // ─────────────────────────────────────────────
  // Listen for changes to the user's OWN membership (e.g., when they get approved)
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
    <div className="min-h-screen bg-nex-bg flex">
      {/* ── Desktop Sidebar ────────────────── */}
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 nex-glass border-r border-nex-border/50 transition-all duration-300 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}>
        {/* Logo */}
        <div className={`flex items-center border-b border-nex-border/50 ${sidebarCollapsed ? 'flex-col gap-2 px-2 py-3' : 'gap-3 px-4 py-4'}`}>
          <img src={logoIcon} alt="NexMess" className="w-9 h-9 rounded-card shrink-0" />
          {!sidebarCollapsed && <h1 className="text-lg font-bold text-nex-text tracking-tight flex-1">NexMess</h1>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-btn text-nex-muted hover:bg-nex-hover transition-colors"
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Mess Selector removed from sidebar */}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {sidebarItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm transition-colors ${
                  isActive ? 'nex-nav-active' : 'nex-nav-inactive'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-nex-border/50">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(profile?.username || 'U')
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-nex-text truncate flex items-center gap-1.5">
                  {profile?.username || 'User'}
                  {profile?.is_verified && (
                    <span className="nex-verified"><CheckCircle2 className="w-3 h-3" /></span>
                  )}
                </p>
                <button onClick={handleSignOut} disabled={signingOut} className="text-xs text-nex-muted hover:text-nex-danger flex items-center gap-1 transition-colors disabled:opacity-50">
                  <LogOut className="w-3 h-3" /> {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ───────────────────── */}
      <div className="flex-1 min-h-screen flex flex-col pb-16 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-10 nex-glass border-b border-nex-border/50 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Header Mess Selector (Desktop & Mobile) */}
            <div className="relative">
              {currentMess ? (
                <>
                  <button
                    onClick={() => setShowMessDropdown(!showMessDropdown)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-nex-elevated hover:bg-nex-hover border border-nex-border/50 transition-colors text-left"
                  >
                    <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {currentMess.name[0]}
                    </div>
                    <div className="min-w-0 pr-1">
                      <p className="text-sm font-semibold text-nex-text leading-tight truncate max-w-[140px] sm:max-w-[200px]">{currentMess.name}</p>
                      <p className="text-[10px] text-nex-muted font-mono leading-none mt-0.5">{currentMess.unique_code}</p>
                    </div>
                    {messes.length > 1 && (
                      <ChevronDown className="w-3.5 h-3.5 text-nex-muted shrink-0 ml-0.5" />
                    )}
                  </button>

                  {showMessDropdown && messes.length > 1 && (
                    <div className="absolute top-full left-0 mt-1.5 w-48 bg-nex-bg border border-nex-border rounded-xl shadow-xl p-1 z-20 space-y-0.5 animate-slide-down">
                      {messes.filter(m => m.id !== currentMess.id).map(mess => (
                        <button
                          key={mess.id}
                          onClick={() => {
                            setCurrentMess(mess)
                            setShowMessDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-nex-hover text-left text-xs text-nex-text transition-colors"
                        >
                          <div className="w-5.5 h-5.5 rounded bg-nex-elevated text-nex-muted flex items-center justify-center text-[10px] font-bold">
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
                  <img src={logoIcon} alt="NexMess" className="w-7 h-7" />
                  <span className="text-sm font-bold text-nex-text">NexMess</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-btn hover:bg-nex-hover text-nex-muted transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-hidden">
          <GlobalErrorBoundary>
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
          </GlobalErrorBoundary>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ──────────────── */}
      <MobileBottomNav handleSignOut={handleSignOut} signingOut={signingOut} isManager={isManager} />
    </div>
  )
}

/* ── Mobile Bottom Navigation with "More" Menu ── */
function MobileBottomNav({ handleSignOut, signingOut, isManager }: { handleSignOut: () => void; signingOut: boolean; isManager: boolean }) {
  const [showMore, setShowMore] = useState(false)

  const mainTabs = navItems.slice(0, 4) // Dashboard, Meals, Chat, Finance

  return (
    <>
      {/* Overlay */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/20 backdrop-blur-sm" onClick={() => setShowMore(false)} />
      )}

      {/* More Menu Popup */}
      {showMore && (
        <div className="md:hidden fixed bottom-16 right-2 left-2 z-30 nex-card p-2 shadow-xl border border-nex-border animate-slide-up safe-area-bottom">
          <NavLink to="/market" onClick={() => setShowMore(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`}>
            <ShoppingBag className="w-5 h-5" /> Market Schedule
          </NavLink>
          <NavLink to="/routine" onClick={() => setShowMore(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`}>
            <CalendarClock className="w-5 h-5" /> Meal Routine
          </NavLink>
          {isManager && (
            <NavLink to="/history" onClick={() => setShowMore(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`}>
              <History className="w-5 h-5" /> History
            </NavLink>
          )}
          <NavLink to="/settings" onClick={() => setShowMore(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`}>
            <Settings className="w-5 h-5" /> Settings
          </NavLink>
          <div className="border-t border-nex-border my-1" />
          <button onClick={handleSignOut} disabled={signingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-nex-danger-light transition-colors disabled:opacity-50">
            <LogOut className="w-5 h-5" /> {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 nex-glass border-t border-nex-border/50 z-20 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          {mainTabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-nex-primary' : 'text-nex-muted'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${showMore ? 'text-nex-primary' : 'text-nex-muted'}`}
          >
            {showMore ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
