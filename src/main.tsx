import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-800.css'
import '@fontsource/hind-siliguri/300.css'
import '@fontsource/hind-siliguri/400.css'
import '@fontsource/hind-siliguri/500.css'
import '@fontsource/hind-siliguri/600.css'
import '@fontsource/hind-siliguri/700.css'
import './index.css'
import './lib/i18n'
import App from './App.tsx'
import { initSentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'

// Initialize observability & crash monitoring
initSentry()
initAnalytics()

function FallbackErrorComponent({ resetError }: { error?: unknown; resetError: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf5f0] p-6 text-center text-[#221e1a]">
      <div className="max-w-md rounded-2xl border border-[#e7dfd3] bg-white p-8 shadow-lg">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 text-xl font-bold text-[#3a5643]">Something went wrong</h2>
        <p className="mb-6 text-sm text-[#6b6258]">
          An unexpected error occurred. Our team has been notified automatically via telemetry.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[#4a6d56] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a5643]"
          >
            Reload Page
          </button>
          <button
            onClick={resetError}
            className="rounded-xl border border-[#e7dfd3] bg-[#faf5f0] px-4 py-2.5 text-sm font-medium text-[#221e1a] transition hover:bg-[#edf2ee]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={FallbackErrorComponent} showDialog={false}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
)
