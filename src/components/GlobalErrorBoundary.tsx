import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { ReactNode } from 'react'

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        {errorMessage}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  )
}

export default function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app here if needed
        window.location.reload()
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
