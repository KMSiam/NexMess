import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useMessStore } from './stores/messStore'

// Guards
import { AuthGuard, GuestGuard } from './guards/AuthGuard'

// Layouts
import AppLayout from './components/layout/AppLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import OnboardingPage from './pages/auth/OnboardingPage'

// App Pages
import DashboardPage from './pages/dashboard/DashboardPage'
import MealsPage from './pages/meals/MealsPage'
import ChatPage from './pages/chat/ChatPage'
import FinancePage from './pages/finance/FinancePage'
import MarketPage from './pages/market/MarketPage'
import SettingsPage from './pages/settings/SettingsPage'
import RoutinePage from './pages/routine/RoutinePage'
import CreateMessPage from './pages/mess/CreateMessPage'
import JoinMessPage from './pages/mess/JoinMessPage'

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, user } = useAuthStore()
  const { fetchUserMesses } = useMessStore()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserMesses(user.id)
    }
  }, [user?.id])

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          {/* Public / Guest routes */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<AuthGuard />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/mess/create" element={<CreateMessPage />} />
            <Route path="/mess/join" element={<JoinMessPage />} />

            {/* App shell with sidebar/nav */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/meals" element={<MealsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/routine" element={<RoutinePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppInitializer>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#F43F5E', secondary: '#FFFFFF' } },
        }}
      />
    </BrowserRouter>
  )
}

export default App
