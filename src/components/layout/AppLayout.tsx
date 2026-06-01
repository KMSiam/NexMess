import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { supabase } from '../../lib/supabase'
import {
  Home, Utensils, MessageSquare, Wallet, ShoppingBag,
  Settings, Zap, LogOut, CheckCircle2,
  CalendarClock, PanelLeft, PanelLeftClose, X, MoreHorizontal,
  Sun, Moon
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
  const { profile, signOut } = useAuthStore()
  const { currentMess, messes, setCurrentMess, fetchUserMesses, reset: resetMess } = useMessStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMessDropdown, setShowMessDropdown] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  
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

        {/* Mess Selector */}
        {!sidebarCollapsed && currentMess && (
          <div className="px-3 py-3 border-b border-nex-border/50">
            <button
              onClick={() => setShowMessDropdown(!showMessDropdown)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-btn bg-nex-elevated hover:bg-nex-hover transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-nex-primary-light text-nex-primary flex items-center justify-center text-xs font-bold shrink-0">
                {currentMess.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-nex-text truncate">{currentMess.name}</p>
                <p className="text-[10px] text-nex-muted">{currentMess.unique_code}</p>
              </div>
            </button>

            {showMessDropdown && messes.length > 1 && (
              <div className="mt-1 nex-card p-1 space-y-0.5">
                {messes.filter(m => m.id !== currentMess.id).map(mess => (
                  <button key={mess.id} onClick={() => { setCurrentMess(mess); setShowMessDropdown(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-btn hover:bg-nex-hover text-left text-sm">
                    <div className="w-6 h-6 rounded bg-nex-elevated text-nex-muted flex items-center justify-center text-xs font-bold">
                      {mess.name[0]}
                    </div>
                    <span className="text-nex-text truncate">{mess.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
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
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-nex-text">{currentMess?.name || 'NexMess'}</p>
                <p className="text-[10px] text-nex-muted">{currentMess?.unique_code || ''}</p>
              </div>
            </div>
            <div className="hidden md:block" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDark(!isDark)}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full w-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </GlobalErrorBoundary>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ──────────────── */}
      <MobileBottomNav handleSignOut={handleSignOut} signingOut={signingOut} />
    </div>
  )
}

/* ── Mobile Bottom Navigation with "More" Menu ── */
function MobileBottomNav({ handleSignOut, signingOut }: { handleSignOut: () => void; signingOut: boolean }) {
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
