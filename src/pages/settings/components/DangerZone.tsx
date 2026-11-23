import { LogOut, Trash2, AlertTriangle, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface DangerZoneProps {
  hasMess: boolean
  isManager: boolean
  messName: string | undefined
  onLeave: () => void
  onDelete: () => void
  onDeleteAccount: () => void
}

export default function DangerZone({
  hasMess,
  isManager,
  messName,
  onLeave,
  onDelete,
  onDeleteAccount,
}: DangerZoneProps) {
  const { t } = useTranslation()

  return (
    <div className="mt-6 space-y-6">
      {/* Leave Mess Zone */}
      {hasMess && (
        <div className="nex-card border border-amber-500/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-500">
            <LogOut className="h-5 w-5" /> {t('settings.dangerSection.leaveTitle')}
          </h3>
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-amber-500/10 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-amber-500">
                {t('settings.dangerSection.leaveTitle')}
              </p>
              <p className="text-nex-muted mt-1 max-w-sm text-xs">
                {t('settings.dangerSection.leaveDesc')}
              </p>
            </div>
            <button
              onClick={onLeave}
              className="nex-btn-secondary flex shrink-0 items-center justify-center gap-2 !border-amber-500/30 text-sm !text-amber-500 hover:!bg-amber-500/10"
            >
              <LogOut className="h-4 w-4" /> {t('settings.dangerSection.leaveTitle')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Mess Zone (Manager only) */}
      {isManager && (
        <div className="nex-card border border-red-500/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-500">
            <AlertTriangle className="h-5 w-5" /> {t('settings.dangerSection.title')}
          </h3>
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-red-500/10 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-red-500">
                {t('settings.dangerSection.deleteMessTitle')} ({messName})
              </p>
              <p className="text-nex-muted mt-1 max-w-sm text-xs">
                {t('settings.dangerSection.deleteMessDesc')}
              </p>
            </div>
            <button
              onClick={onDelete}
              className="nex-btn-danger flex shrink-0 items-center justify-center gap-2 text-sm"
            >
              <Trash2 className="h-4 w-4" /> {t('settings.dangerSection.deleteMessTitle')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Zone (Visible only if not in a mess) */}
      {!hasMess && (
        <div className="nex-card border border-red-500/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-500">
            <UserX className="h-5 w-5" /> {t('settings.dangerSection.deleteAccountTitle')}
          </h3>
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-red-500/10 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-red-500">
                {t('settings.dangerSection.deleteAccountTitle')}
              </p>
              <p className="text-nex-muted mt-1 max-w-sm text-xs">
                {t('settings.dangerSection.deleteAccountDesc')}
              </p>
            </div>
            <button
              onClick={onDeleteAccount}
              className="nex-btn-danger flex shrink-0 items-center justify-center gap-2 border-none bg-red-500/10 text-sm text-red-500 shadow-none hover:bg-red-500 hover:text-white"
            >
              <Trash2 className="h-4 w-4" /> {t('settings.dangerSection.deleteAccountTitle')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
