import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useMessStore } from '../../stores/messStore'
import { Users, ArrowRight, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { sanitizeAppError } from '../../lib/errorHandler'
import {
  clearPendingInviteCode,
  getPendingInviteCode,
  normalizeInviteCode,
} from '../../lib/invite'

export default function JoinMessPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { joinMess, pendingRequests, cancelJoinRequest } = useMessStore()
  const [code, setCode] = useState(() => {
    const fromParam = normalizeInviteCode(searchParams.get('code'))
    return fromParam || getPendingInviteCode()
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fromParam = normalizeInviteCode(searchParams.get('code'))
    if (fromParam) {
      setCode(fromParam)
      clearPendingInviteCode()
    } else if (getPendingInviteCode()) {
      clearPendingInviteCode()
    }
  }, [searchParams])

  const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cleanCode = code.trim().toUpperCase()

    if (!cleanCode || !user) return

    if (cleanCode.length < 4 || cleanCode.length > 20) {
      toast.error('Please enter a valid mess code')
      return
    }

    setLoading(true)
    try {
      const result = await joinMess(cleanCode, user.id)
      if (result.success) {
        clearPendingInviteCode()
        toast.success('Join request sent! Waiting for manager approval.')
        navigate('/dashboard')
      } else {
        toast.error(sanitizeAppError(result.error, 'Failed to join mess'))
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to submit join request'))
    } finally {
      setLoading(false)
    }
  }

  const hasPending = pendingRequests && pendingRequests.length > 0
  const pendingReq = hasPending ? pendingRequests[0] : null

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="nex-card p-8">
        <div className="rounded-card bg-nex-primary-light mx-auto mb-6 flex h-14 w-14 items-center justify-center">
          <Users className="text-nex-primary h-7 w-7" />
        </div>
        <h1 className="text-nex-text mb-1 text-center text-2xl font-bold">{t('mess.join.title')}</h1>

        {hasPending ? (
          <div className="mt-8 space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h3 className="mb-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                  {t('mess.join.pendingTitle')}
                </h3>
                <p className="text-nex-muted text-xs leading-relaxed">
                  {t('mess.join.pendingDesc')}{' '}
                  <strong>({pendingReq?.messes?.name || 'Mess'})</strong>.
                </p>
              </div>
            </div>

            <div className="nex-card border-nex-border/80 space-y-4 border p-5 text-center">
              <div className="nex-avatar-mess mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-base font-bold text-white shadow-inner">
                {pendingReq?.messes?.avatar_url ? (
                  <img src={pendingReq.messes.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  pendingReq?.messes?.name?.[0] || '?'
                )}
              </div>
              <div>
                <h4 className="text-nex-text font-bold">
                  {pendingReq?.messes?.name || 'Unknown Mess'}
                </h4>
                <p className="mt-1 text-xs font-medium text-amber-500">
                  {t('mess.join.waitingApproval')}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (user?.id && pendingReq) {
                    try {
                      await cancelJoinRequest(pendingReq.mess_id, user.id)
                      toast.success('Request canceled')
                    } catch (err: unknown) {
                      toast.error(sanitizeAppError(err, 'Failed to cancel request'))
                    }
                  }
                }}
                className="nex-btn-danger bg-nex-danger-light text-nex-danger w-full py-2.5 hover:bg-rose-600 hover:text-white"
              >
                {t('mess.join.cancelRequest')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-nex-muted mb-8 text-center">
              {t('mess.join.subtitle')}
            </p>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-nex-text mb-1.5 block text-sm font-medium">{t('mess.join.codeLabel')}</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="nex-input text-center font-mono text-lg tracking-widest"
                  placeholder={t('mess.join.codePlaceholder')}
                  required
                  maxLength={12}
                  id="join-code-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="nex-btn-primary w-full py-3 disabled:opacity-50"
                id="join-mess-btn"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    {t('mess.join.submit')} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
