import { LogOut, Trash2, AlertTriangle } from 'lucide-react'

interface DangerZoneProps {
  hasMess: boolean
  isManager: boolean
  messName: string | undefined
  onLeave: () => void
  onDelete: () => void
}

export default function DangerZone({ hasMess, isManager, messName, onLeave, onDelete }: DangerZoneProps) {
  return (
    <div className="space-y-6 mt-6">
      {/* Leave Mess Zone */}
      {hasMess && (
        <div className="nex-card p-6 border border-amber-500/20">
          <h3 className="text-lg font-semibold text-amber-500 mb-4 flex items-center gap-2">
            <LogOut className="w-5 h-5" /> Leave Mess
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-500/10 rounded-xl">
            <div>
              <p className="text-sm font-medium text-amber-500">Leave your current mess</p>
              <p className="text-xs text-nex-muted mt-1 max-w-sm">
                This will remove your access to the mess. You must create or join another mess afterwards.
              </p>
            </div>
            <button onClick={onLeave} className="nex-btn-secondary text-sm shrink-0 flex items-center justify-center gap-2 !text-amber-500 !border-amber-500/30 hover:!bg-amber-500/10">
              <LogOut className="w-4 h-4" /> Leave Mess
            </button>
          </div>
        </div>
      )}

      {/* Delete Mess Zone (Manager only) */}
      {isManager && (
        <div className="nex-card p-6 border border-red-500/20">
          <h3 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-500/10 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-500">Delete this mess</p>
              <p className="text-xs text-nex-muted mt-1 max-w-sm">
                Permanently delete "{messName}" and all its data. This action is irreversible and affects all members.
              </p>
            </div>
            <button onClick={onDelete} className="nex-btn-danger text-sm shrink-0 flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete Mess
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
