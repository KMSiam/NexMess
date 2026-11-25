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
    const rawNext = params.get('next')
    const next =
      rawNext && /^\/(?!\/)/.test(rawNext.trim()) ? rawNext.trim() : '/dashboard'
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      console.error('Auth callback error:', error, errorDescription)
      navigate('/login?error=' + encodeURIComponent(errorDescription ?? error), { replace: true })
      return
    }

    const completeCallback = () => {
      if (next === '/update-password') {
        navigate('/update-password', { replace: true, state: { isRecovery: true } })
      } else {
        navigate(next, { replace: true })
      }
    }

    if (code) {
      // Code is still in URL, manually exchange it
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error('Code exchange failed:', error.message)
            navigate('/login', { replace: true })
          } else {
            completeCallback()
          }
        })
    } else {
      // No code — it might have been auto-exchanged by Supabase SDK. 
      // Verify if we have a session.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          completeCallback()
        } else {
          navigate('/login', { replace: true })
        }
      })
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
