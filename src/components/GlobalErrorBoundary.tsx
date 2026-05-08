import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { ReactNode } from 'react'

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-nex-danger-light flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-nex-danger" />
      </div>
      <h2 className="text-xl font-bold text-nex-text mb-2">Something went wrong</h2>
      <p className="text-sm text-nex-muted max-w-md mb-6">
        {errorMessage}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="nex-btn-primary"
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
