import { useState, useEffect, useRef, Suspense } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { useThemeStore } from '../../stores/themeStore'
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
  ChevronLeft,
  X,
  MoreHorizontal,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import NotificationBell from '../NotificationBell'
import LanguageSwitcher from '../LanguageSwitcher'
import GlobalErrorBoundary from '../GlobalErrorBoundary'
import { getInitials } from '../../lib/utils'
import logoIcon from '../../assets/logo-icon.svg'

export default function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuthStore()
  const { currentMess, messes, setCurrentMess, fetchUserMesses, reset: resetMess } = useMessStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024
  )
  const [showMessDropdown, setShowMessDropdown] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const messDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (messDropdownRef.current && !messDropdownRef.current.contains(e.target as Node)) {
        setShowMessDropdown(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMessDropdown(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [])

  const sidebarItems = currentMess
    ? [
        { to: '/dashboard', icon: Home, label: t('nav.dashboard') },
        { to: '/meals', icon: Utensils, label: t('nav.meals') },
        { to: '/nexmess-ai', icon: Sparkles, label: t('nav.nexmessAi') },
        { to: '/finance', icon: Wallet, label: t('nav.finance') },
        { to: '/market', icon: ShoppingBag, label: t('nav.market') },
        { to: '/chat', icon: MessageSquare, label: t('nav.chat') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ]
    : [
        { to: '/dashboard', icon: Home, label: t('nav.dashboard') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ]

  const { isDark, toggleTheme } = useThemeStore()

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
        className={`bg-nex-surface/95 border-nex-border/60 sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r backdrop-blur-md transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] md:flex ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="bg-nex-surface border-nex-border text-nex-muted hover:text-nex-text hover:bg-nex-hover absolute top-5 -right-3.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              sidebarCollapsed ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-nex-border/50 flex h-[65px] shrink-0 items-center gap-3 border-b px-[18px]">
            <img src={logoIcon} alt="NexMess" className="rounded-card h-9 w-9 shrink-0" />
            <h1
              className={`text-nex-text overflow-hidden text-lg font-bold tracking-tight whitespace-nowrap transition-[opacity,transform] duration-200 ease-out ${
                sidebarCollapsed
                  ? 'pointer-events-none -translate-x-2 opacity-0'
                  : 'translate-x-0 opacity-100 delay-75'
              }`}
              aria-hidden={sidebarCollapsed}
            >
              NexMess
            </h1>
          </div>

          <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-3">
            {sidebarItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `rounded-btn flex items-center gap-3 py-2.5 pr-3 pl-[10px] text-sm transition-colors duration-200 ${
                    isActive ? 'nex-nav-active' : 'nex-nav-inactive'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-[opacity,transform] duration-200 ease-out ${
                    sidebarCollapsed
                      ? 'pointer-events-none -translate-x-2 opacity-0'
                      : 'translate-x-0 opacity-100 delay-75'
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="border-nex-border/50 shrink-0 border-t px-[18px] py-3">
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
                  <span className="border-white dark:border-nex-bg absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-blue-500 text-white shadow-sm" title="Verified Member">
                    <Check className="h-1.5 w-1.5 stroke-[4]" />
                  </span>
                )}
              </div>
              <div
                className={`min-w-0 flex-1 overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
                  sidebarCollapsed
                    ? 'pointer-events-none -translate-x-2 opacity-0'
                    : 'translate-x-0 opacity-100 delay-75'
                }`}
                aria-hidden={sidebarCollapsed}
              >
                <p className="text-nex-text flex items-center gap-1.5 truncate text-sm font-medium">
                  {profile?.username || 'User'}
                </p>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  tabIndex={sidebarCollapsed ? -1 : undefined}
                  className="text-nex-muted hover:text-nex-danger flex items-center gap-1 text-xs whitespace-nowrap transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-3 w-3 shrink-0" />{' '}
                  {signingOut ? t('common.signingOut') : t('common.signOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="nex-glass border-nex-border/50 sticky top-0 z-30 border-b px-4 py-3 md:px-6">
          <div className="flex items-center justify-between font-medium">
            <div className="relative" ref={messDropdownRef}>
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-btn hover:bg-nex-hover text-nex-muted hover:text-nex-text relative flex h-9 w-9 items-center justify-center transition-colors active:scale-95"
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
  const { t } = useTranslation()
  const [showMore, setShowMore] = useState(false)

  const mobileNavItems = [
    { to: '/dashboard', icon: Home, label: t('nav.dashboard') },
    { to: '/meals', icon: Utensils, label: t('nav.meals') },
    { to: '/nexmess-ai', icon: Sparkles, label: t('nav.nexmessAi') },
    { to: '/finance', icon: Wallet, label: t('nav.finance') },
    { to: '/market', icon: ShoppingBag, label: t('nav.market') },
    { to: '/chat', icon: MessageSquare, label: t('nav.chat') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ]

  const mainTabs = hasMess
    ? mobileNavItems.slice(0, 4) // Dashboard, Meals, AI, Finance
    : [
        { to: '/dashboard', icon: Home, label: t('nav.dashboard') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ]

  useEffect(() => {
    document.documentElement.dataset.mobileDrawer = showMore ? 'open' : 'closed'
    if (!showMore) {
      return () => {
        delete document.documentElement.dataset.mobileDrawer
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMore(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      delete document.documentElement.dataset.mobileDrawer
    }
  }, [showMore])

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              key="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={() => setShowMore(false)}
            />

            <motion.div
              key="mobile-drawer-sheet"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="nex-card border-nex-border safe-area-bottom fixed right-2 bottom-20 left-2 z-50 border p-2 shadow-2xl md:hidden"
            >
              <NavLink
                to="/market"
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`
                }
              >
                <ShoppingBag className="h-5 w-5" /> {t('nav.market')}
              </NavLink>
              <NavLink
                to="/chat"
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`
                }
              >
                <MessageSquare className="h-5 w-5" /> {t('nav.chat')}
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${isActive ? 'bg-nex-primary-light text-nex-primary font-medium' : 'text-nex-text hover:bg-nex-hover'}`
                }
              >
                <Settings className="h-5 w-5" /> {t('nav.settings')}
              </NavLink>
              <div className="border-nex-border my-1 border-t" />
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="hover:bg-nex-danger-light flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-5 w-5" /> {signingOut ? t('common.signingOut') : t('common.signOut')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="nex-glass border-nex-border/50 safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
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
              <span className="text-[10px] font-medium">{t('common.more')}</span>
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
                {signingOut ? t('common.signingOut') : t('common.signOut')}
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
