import { getInitials } from '../../../lib/utils'
import { UserCheck, UserX, CheckCircle2 } from 'lucide-react'
import type { MessMember } from '../../../types/database'

interface MemberManagementProps {
  pendingMembers: MessMember[]
  approvedMembers: MessMember[]
  isManager: boolean
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
  onRemove: (userId: string) => void
  onMakeManager: (userId: string) => void
  onDemoteManager: (userId: string) => void
}

export default function MemberManagement({
  pendingMembers,
  approvedMembers,
  isManager,
  onApprove,
  onReject,
  onRemove,
  onMakeManager,
  onDemoteManager,
}: MemberManagementProps) {
  return (
    <div className="space-y-6">
      {/* Pending Requests (Manager) */}
      {isManager && pendingMembers.length > 0 && (
        <div className="nex-card p-6">
          <h3 className="text-lg font-semibold text-nex-text mb-4 flex items-center gap-2">
            Pending Requests
            <span className="nex-badge nex-badge-danger">{pendingMembers.length}</span>
          </h3>
          <div className="space-y-3">
            {pendingMembers.map(member => {
              const p = member.profiles as any
              return (
                <div key={member.user_id} className="flex items-center justify-between p-3 bg-nex-elevated rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-nex-border flex items-center justify-center text-sm font-semibold text-nex-muted">
                      {getInitials(p?.username || '?')}
                    </div>
                    <p className="text-sm font-medium text-nex-text">{p?.username || 'Unknown'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onApprove(member.user_id)} className="nex-btn-primary text-xs py-1.5 px-3">
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => onReject(member.user_id)} className="nex-btn-danger text-xs py-1.5 px-3">
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="nex-card p-6">
        <h3 className="text-lg font-semibold text-nex-text mb-4">Members ({approvedMembers.length})</h3>
        <div className="space-y-2">
          {approvedMembers.map(member => {
            const p = member.profiles as any
            return (
              <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-nex-hover transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : getInitials(p?.username || '?')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-nex-text flex items-center gap-1.5">
                      {p?.username || 'Unknown'}
                      {p?.is_verified && <span className="nex-verified"><CheckCircle2 className="w-3 h-3" /></span>}
                    </p>
                    <p className="text-xs text-nex-muted capitalize">{member.role}</p>
                  </div>
                </div>
                {isManager && (
                  <div className="flex items-center gap-3">
                    {member.role === 'member' ? (
                      <button onClick={() => onMakeManager(member.user_id)} className="text-xs font-medium text-nex-primary hover:text-blue-700 transition-colors bg-nex-primary-light px-2 py-1 rounded">
                        Make Manager
                      </button>
                    ) : (
                      <button onClick={() => onDemoteManager(member.user_id)} className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 px-2 py-1 rounded">
                        Demote Manager
                      </button>
                    )}
                    {member.role !== 'manager' && (
                      <button onClick={() => onRemove(member.user_id)} className="text-xs text-nex-muted hover:text-nex-danger transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
