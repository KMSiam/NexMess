import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users,
  ArrowRight,
  MapPin,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore, type MessInvitePreview } from '../../stores/messStore'
import {
  normalizeInviteCode,
  savePendingInviteCode,
  clearPendingInviteCode,
} from '../../lib/invite'
import { sanitizeAppError } from '../../lib/errorHandler'
import { getInitials } from '../../lib/utils'
import { usePageTitle } from '../../hooks/usePageTitle'
import logoIcon from '../../assets/logo-icon.svg'

export default function InviteJoinPage() {
  const { code } = useParams<{ code: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuthStore()
  const {
    messes,
    pendingRequests,
    findMessByCode,
    joinMess,
    setCurrentMess,
  } = useMessStore()

  const cleanCode = normalizeInviteCode(code)
  usePageTitle(cleanCode ? `${t('mess.invite.pageTitle')} (${cleanCode})` : t('mess.invite.pageTitle'))

  const [preview, setPreview] = useState<MessInvitePreview | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupDone, setLookupDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Persist invite code for unauthenticated or pre-onboarding visitors
  useEffect(() => {
    if (authLoading || !cleanCode) return
    if (!user || !profile?.username) {
      savePendingInviteCode(cleanCode)
    }
  }, [authLoading, cleanCode, user, profile?.username])

  // Redirect signed-in users without a completed profile to onboarding first
  useEffect(() => {
    if (!authLoading && user && profile && !profile.username) {
      if (cleanCode) savePendingInviteCode(cleanCode)
      navigate('/onboarding', { replace: true })
    }
  }, [authLoading, user, profile, cleanCode, navigate])

  // Look up mess details once signed in & onboarded
  useEffect(() => {
    if (authLoading || !user || !profile?.username || !cleanCode) return
    clearPendingInviteCode()

    let cancelled = false
    setLookingUp(true)
    setLookupDone(false)
    findMessByCode(cleanCode)
      .then((res) => {
        if (cancelled) return
        setPreview(res)
      })
      .finally(() => {
        if (!cancelled) {
          setLookingUp(false)
          setLookupDone(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, user, profile?.username, cleanCode, findMessByCode])

  const alreadyMemberMess = preview ? messes.find((m) => m.id === preview.id) : undefined
  const hasPending = pendingRequests.length > 0

  const handleJoinConfirm = async () => {
    if (!user || !cleanCode) return
    setSubmitting(true)
    try {
      const result = await joinMess(cleanCode, user.id)
      if (result.success) {
        clearPendingInviteCode()
        toast.success(t('mess.invite.requestSentToast'))
        navigate('/dashboard', { replace: true })
      } else {
        toast.error(sanitizeAppError(result.error, t('mess.invite.joinFailed')))
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, t('mess.invite.joinFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-nex-bg flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="h-9 w-9 overflow-hidden rounded-xl shadow-sm">
          <img src={logoIcon} alt="NexMess" className="h-full w-full" />
        </div>
        <span className="text-nex-text text-lg font-bold tracking-tight">NexMess</span>
      </div>

      <div className="nex-card w-full max-w-md p-6 sm:p-8">
        {!cleanCode ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h1 className="text-nex-text text-xl font-bold">{t('mess.invite.invalidTitle')}</h1>
            <p className="text-nex-muted text-sm">{t('mess.invite.invalidDesc')}</p>
            <div className="pt-2">
              <Link to={user ? '/mess/join' : '/'} className="nex-btn-primary w-full justify-center py-2.5">
                {user ? t('mess.join.title') : t('mess.invite.goHome')}
              </Link>
            </div>
          </div>
        ) : authLoading || (user && profile && !profile.username) ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-nex-muted text-sm">{t('common.loading')}</p>
          </div>
        ) : !user ? (
          <div className="space-y-5 text-center">
            <div className="bg-nex-primary-light mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
              <Sparkles className="text-nex-primary h-7 w-7" />
            </div>
            <div>
              <h1 className="text-nex-text text-2xl font-bold">{t('mess.invite.guestTitle')}</h1>
              <p className="text-nex-muted mt-1.5 text-sm">{t('mess.invite.guestDesc')}</p>
            </div>

            <div className="bg-nex-elevated border-nex-border rounded-2xl border p-4">
              <p className="text-nex-muted text-[11px] font-semibold tracking-wider uppercase">
                {t('mess.join.codeLabel')}
              </p>
              <p className="text-nex-primary mt-1 font-mono text-2xl font-bold tracking-widest">
                {cleanCode}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <Link to="/register" className="nex-btn-primary w-full justify-center gap-2 py-3">
                <UserPlus className="h-4 w-4" />
                {t('mess.invite.createAccount')}
              </Link>
              <Link to="/login" className="nex-btn-secondary w-full justify-center gap-2 py-2.5">
                <LogIn className="h-4 w-4" />
                {t('mess.invite.signIn')}
              </Link>
            </div>
          </div>
        ) : lookingUp || !lookupDone ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="border-nex-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-nex-muted text-sm">{t('mess.invite.lookingUp')}</p>
          </div>
        ) : !preview ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h1 className="text-nex-text text-xl font-bold">{t('mess.invite.notFoundTitle')}</h1>
            <p className="text-nex-muted text-sm">
              {t('mess.invite.notFoundDesc', { code: cleanCode })}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/mess/join" className="nex-btn-primary w-full justify-center py-2.5">
                {t('mess.invite.enterCodeManually')}
              </Link>
              <Link to="/dashboard" className="nex-btn-secondary w-full justify-center py-2.5">
                {t('notFound.backHome')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#3a5643] to-[#4a6d56] text-xl font-bold text-white shadow-sm">
              {preview.avatar_url ? (
                <img src={preview.avatar_url} alt={preview.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(preview.name)
              )}
            </div>

            <div>
              <span className="bg-nex-elevated text-nex-muted inline-block rounded-full px-3 py-0.5 font-mono text-xs font-semibold">
                {cleanCode}
              </span>
              <h1 className="text-nex-text mt-2 text-2xl font-bold">{preview.name}</h1>
              {preview.location && (
                <p className="text-nex-muted mt-1 inline-flex items-center justify-center gap-1 text-xs">
                  <MapPin className="h-3.5 w-3.5" />
                  {preview.location}
                </p>
              )}
            </div>

            {alreadyMemberMess ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {t('mess.invite.alreadyMember')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMess(alreadyMemberMess)
                    navigate('/dashboard', { replace: true })
                  }}
                  className="nex-btn-primary w-full justify-center gap-2 py-3"
                >
                  {t('notFound.backHome')} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : hasPending ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-left text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('mess.join.pendingDesc')}</span>
                </div>
                <Link to="/mess/join" className="nex-btn-secondary w-full justify-center py-2.5">
                  {t('mess.invite.managePending')}
                </Link>
              </div>
            ) : preview.is_full ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                  <Users className="h-4 w-4 shrink-0" />
                  {t('mess.invite.messFull')}
                </div>
                <Link to="/dashboard" className="nex-btn-secondary w-full justify-center py-2.5">
                  {t('notFound.backHome')}
                </Link>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleJoinConfirm}
                  disabled={submitting}
                  className="nex-btn-primary w-full justify-center gap-2 py-3 disabled:opacity-50"
                  id="invite-confirm-join-btn"
                >
                  {submitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      {t('mess.join.submit')} <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <Link to="/dashboard" className="text-nex-muted hover:text-nex-text inline-block text-xs">
                  {t('common.cancel')}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
