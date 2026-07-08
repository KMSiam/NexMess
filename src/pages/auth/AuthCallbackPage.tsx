import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/**
 * This page handles Supabase PKCE auth redirects.
 *
 * Supabase (v2, PKCE flow) redirects to this URL after:
 *  - Email verification  → ?next=/dashboard
 *  - Password reset      → ?next=/update-password
 *  - OAuth sign-in       → ?next=/dashboard
 *
 * The `code` query param is exchanged for a session, then the user
 * is forwarded to whatever `next` says (default: /dashboard).
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const next = params.get('next') ?? '/dashboard'
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      console.error('Auth callback error:', error, errorDescription)
      navigate('/login?error=' + encodeURIComponent(errorDescription ?? error), { replace: true })
      return
    }

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error('Code exchange failed:', error.message)
            navigate('/login', { replace: true })
          } else {
            // For password recovery, Supabase fires PASSWORD_RECOVERY after
            // code exchange — navigate to update-password to let it handle that
            navigate(next, { replace: true })
          }
        })
    } else {
      // No code — fallback
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <div className="bg-nex-bg flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-nex-muted text-sm">Verifying your link...</p>
      </div>
    </div>
  )
}
