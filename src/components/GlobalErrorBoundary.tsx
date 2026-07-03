import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { ReactNode } from 'react'

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
  return (
    <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="bg-nex-danger-light mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertTriangle className="text-nex-danger h-8 w-8" />
      </div>
      <h2 className="text-nex-text mb-2 text-xl font-bold">Something went wrong</h2>
      <p className="text-nex-muted mb-6 max-w-md text-sm">{errorMessage}</p>
      <button onClick={resetErrorBoundary} className="nex-btn-primary">
        <RefreshCw className="h-4 w-4" />
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
