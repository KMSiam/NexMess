import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useMessStore } from './stores/messStore'
import { supabase } from './lib/supabase'
import { trackPageView, identifyUser, resetUser } from './lib/analytics'
import { setUserContext, clearUserContext } from './lib/sentry'

// Guards
import { AuthGuard, GuestGuard, OnboardingGuard } from './guards/AuthGuard'

// Layouts
import AppLayout from './components/layout/AppLayout'

// Auth / Public Pages
const LandingPage = lazy(() => import('./pages/landing/LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'))
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const UpdatePasswordPage = lazy(() => import('./pages/auth/UpdatePasswordPage'))
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'))

// App Pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const MealsPage = lazy(() => import('./pages/meals/MealsPage'))
const ChatPage = lazy(() => import('./pages/chat/ChatPage'))
const FinancePage = lazy(() => import('./pages/finance/FinancePage'))
const MarketPage = lazy(() => import('./pages/market/MarketPage'))
const AIMarketAssistant = lazy(() => import('./pages/market/components/AIMarketAssistant'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const CreateMessPage = lazy(() => import('./pages/mess/CreateMessPage'))
const JoinMessPage = lazy(() => import('./pages/mess/JoinMessPage'))
const InviteJoinPage = lazy(() => import('./pages/mess/InviteJoinPage'))
const ActivityLogPage = lazy(() => import('./pages/activity/ActivityLogPage'))
const NotFoundPage = lazy(() => import('./pages/not-found/NotFoundPage'))
const PrivacyPage = lazy(() => import('./pages/privacy/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/terms/TermsPage'))
const FAQPage = lazy(() => import('./pages/faq/FAQPage'))

function PageLoader() {
  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center">
      <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  )
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, user, profile } = useAuthStore()
  const { fetchUserMesses, messes, currentMess, setCurrentMess, loading: messLoading } =
    useMessStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Always scroll to top when navigating between routes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Track virtual pageviews on route navigation
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])

  // Handle Service Worker notification click messages in already-open tabs/PWAs
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; url?: string; messId?: string | null; notificationId?: string | null }
        | undefined
      if (!data || data.type !== 'NEXMESS_NOTIFICATION_CLICK') return

      event.ports?.[0]?.postMessage({ ack: true })

      const targetUrl =
        typeof data.url === 'string' && /^\/(?!\/)/.test(data.url.trim())
          ? data.url.trim()
          : '/dashboard'

      if (data.messId) {
        const messState = useMessStore.getState()
        const targetMess = messState.messes.find((m) => m.id === data.messId)
        if (targetMess && messState.currentMess?.id !== targetMess.id) {
          messState.setCurrentMess(targetMess)
        }
      }

      if (data.notificationId && user?.id) {
        void supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', data.notificationId)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (!error) {
              window.dispatchEvent(
                new CustomEvent('nexmess:notification-read', {
                  detail: { id: data.notificationId },
                })
              )
            }
          })
      }

      navigate(targetUrl)
    }

    navigator.serviceWorker.addEventListener('message', handleSwMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage)
    }
  }, [navigate, user?.id])

  // Apply post-OAuth notification redirect if preserved in sessionStorage
  useEffect(() => {
    if (!user?.id || !profile?.username) return
    const pendingRedirect = sessionStorage.getItem('nexmess-post-login-redirect')
    if (pendingRedirect && /^\/(?!\/)/.test(pendingRedirect)) {
      sessionStorage.removeItem('nexmess-post-login-redirect')
      navigate(pendingRedirect, { replace: true })
    }
  }, [user?.id, profile?.username, navigate])

  // Handle cold-start notification query params (?mess=...&notif=...)
  useEffect(() => {
    if (!user?.id || !location.search) return
    const params = new URLSearchParams(location.search)
    const messParam = params.get('mess')
    const notifParam = params.get('notif')
    if (!messParam && !notifParam) return

    // Wait for messes list before consuming ?mess= so multi-mess users switch properly
    if (messParam && messLoading && messes.length === 0) return

    if (messParam) {
      const targetMess = messes.find((m) => m.id === messParam)
      if (targetMess && currentMess?.id !== targetMess.id) {
        setCurrentMess(targetMess)
      }
    }

    if (notifParam) {
      void supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifParam)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (!error) {
            window.dispatchEvent(
              new CustomEvent('nexmess:notification-read', { detail: { id: notifParam } })
            )
          }
        })
    }

    params.delete('mess')
    params.delete('notif')
    const nextSearch = params.toString()
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
  }, [
    user?.id,
    location.pathname,
    location.search,
    messes,
    messLoading,
    currentMess?.id,
    setCurrentMess,
    navigate,
  ])

  // Synchronize authenticated user identity with telemetry & crash reporting (pseudonymous ID only)
  useEffect(() => {
    if (user) {
      identifyUser(user.id)
      setUserContext(user.id)
    } else {
      resetUser()
      clearUserContext()
    }
  }, [user])

  // Handle Supabase error redirects (e.g. expired OTP link)
  // Supabase sends errors back to the Site URL as #error=...&error_code=...&error_description=...
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('error=')) return

    const params = new URLSearchParams(hash.replace('#', ''))
    const errorCode = params.get('error_code')
    const errorDescription = params.get('error_description') ?? 'Something went wrong'

    // Clear the hash from the URL so it doesn't linger
    window.history.replaceState(null, '', window.location.pathname)

    if (errorCode === 'otp_expired') {
      navigate('/forgot-password?expired=1', { replace: true })
    } else {
      navigate('/login?error=' + encodeURIComponent(errorDescription), { replace: true })
    }
  }, [navigate])

  // Initialize theme store on root app mount
  useEffect(() => {
    const saved = localStorage.getItem('nexmess-theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user) {
      fetchUserMesses(user.id)
    }
  }, [user, fetchUserMesses])

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Landing & Info Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/join/:code" element={<InviteJoinPage />} />
            <Route path="/privacy-policy" element={<PrivacyPage />} />
            <Route path="/terms-of-service" element={<TermsPage />} />
            <Route path="/faq" element={<FAQPage />} />

            {/* Public / Guest routes */}
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Password reset — accessible with only a recovery token, no full session required */}
            <Route path="/update-password" element={<UpdatePasswordPage />} />

            {/* PKCE auth callback — handles code exchange for all Supabase email flows */}
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected routes */}
            <Route element={<AuthGuard />}>
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* Force onboarding before allowing access to app features */}
              <Route element={<OnboardingGuard />}>
                <Route path="/mess/create" element={<CreateMessPage />} />
                <Route path="/mess/join" element={<JoinMessPage />} />

                {/* App shell with sidebar/nav */}
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/meals" element={<MealsPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/finance" element={<FinancePage />} />
                  <Route path="/market" element={<MarketPage />} />
                  <Route path="/nexmess-ai" element={<AIMarketAssistant />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/activity" element={<ActivityLogPage />} />
                </Route>
              </Route>
            </Route>

            {/* 404 / Not Found page fallback */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </AppInitializer>

      {/* Toast notifications — uses CSS vars so it auto-tracks light/dark theme */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--nex-surface)',
            color: 'var(--nex-text)',
            border: '1px solid var(--nex-border)',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06)',
          },
          success: { iconTheme: { primary: 'var(--nex-success)', secondary: 'var(--nex-surface)' } },
          error: { iconTheme: { primary: 'var(--nex-danger)', secondary: 'var(--nex-surface)' } },
        }}
      />
    </BrowserRouter>
  )
}

export default App
