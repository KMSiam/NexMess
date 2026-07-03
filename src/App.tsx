import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useMessStore } from './stores/messStore'

// Guards
import { AuthGuard, GuestGuard, OnboardingGuard, ManagerGuard } from './guards/AuthGuard'

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

// App Pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const MealsPage = lazy(() => import('./pages/meals/MealsPage'))
const ChatPage = lazy(() => import('./pages/chat/ChatPage'))
const FinancePage = lazy(() => import('./pages/finance/FinancePage'))
const MarketPage = lazy(() => import('./pages/market/MarketPage'))
const AIMarketAssistant = lazy(() => import('./pages/market/components/AIMarketAssistant'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const HistoryPage = lazy(() => import('./pages/history/HistoryPage'))
const CreateMessPage = lazy(() => import('./pages/mess/CreateMessPage'))
const JoinMessPage = lazy(() => import('./pages/mess/JoinMessPage'))
const ActivityLogPage = lazy(() => import('./pages/activity/ActivityLogPage'))
const NotFoundPage = lazy(() => import('./pages/not-found/NotFoundPage'))
const PrivacyPage = lazy(() => import('./pages/privacy/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/terms/TermsPage'))

function PageLoader() {
  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center">
      <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  )
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, user } = useAuthStore()
  const { fetchUserMesses } = useMessStore()

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
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy-policy" element={<PrivacyPage />} />
            <Route path="/terms-of-service" element={<TermsPage />} />

            {/* Public / Guest routes */}
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Password reset — accessible with only a recovery token, no full session required */}
            <Route path="/update-password" element={<UpdatePasswordPage />} />

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
                  <Route path="/market-assistant" element={<AIMarketAssistant />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/activity" element={<ActivityLogPage />} />

                  {/* Manager-only section */}
                  <Route element={<ManagerGuard />}>
                    <Route path="/history" element={<HistoryPage />} />
                  </Route>
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
          success: { iconTheme: { primary: '#10B981', secondary: 'var(--nex-surface)' } },
          error: { iconTheme: { primary: '#F43F5E', secondary: 'var(--nex-surface)' } },
        }}
      />
    </BrowserRouter>
  )
}

export default App
