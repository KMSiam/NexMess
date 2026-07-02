import { useState } from 'react'
import { getInitials } from '../../../lib/utils'
import { UserCheck, UserX, CheckCircle2, Phone, ShieldAlert, FileText, X } from 'lucide-react'
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
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null)
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
              <div key={member.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 rounded-xl hover:bg-nex-hover transition-colors border border-transparent hover:border-nex-border">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 mt-0.5">
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
                    
                    {isManager && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                        {p?.contact_no && (
                          <span className="flex items-center gap-1 text-nex-muted bg-nex-elevated px-2 py-0.5 rounded border border-nex-border">
                            <Phone className="w-3 h-3 text-nex-primary shrink-0" />
                            <span className="font-semibold text-nex-text">{p.contact_no}</span>
                          </span>
                        )}
                        {p?.emergency_contact_no && (
                          <span className="flex items-center gap-1 text-red-500/90 dark:text-red-400/90 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-medium">
                            <ShieldAlert className="w-3 h-3 shrink-0" />
                            <span>Emerg: <span className="font-semibold">{p.emergency_contact_no}</span></span>
                          </span>
                        )}
                        {p?.verification_doc_type && p?.verification_doc_no && (
                          <span className="flex items-center gap-1 bg-nex-elevated px-2 py-0.5 rounded border border-nex-border text-nex-muted">
                            <FileText className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="uppercase text-[10px] font-bold text-nex-text">
                              {p.verification_doc_type === 'nid'
                                ? 'NID'
                                : p.verification_doc_type === 'birth_certificate'
                                ? 'Birth Cert'
                                : 'Doc'}
                              :
                            </span>
                            <span className="font-mono text-[11px] text-nex-text">{p.verification_doc_no}</span>
                            {p.verification_doc_url && (
                              <button
                                type="button"
                                onClick={() => setSelectedDocUrl(p.verification_doc_url)}
                                className="text-[10px] text-nex-primary hover:underline hover:text-blue-500 font-semibold ml-1.5 border-l border-nex-border pl-1.5 shrink-0"
                              >
                                View Copy
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isManager && (
                  <div className="flex items-center gap-3 sm:self-center self-end">
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

      {/* Lightbox Modal for Verification Document */}
      {selectedDocUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setSelectedDocUrl(null)}>
          <div className="relative max-w-3xl w-full bg-nex-bg p-2 rounded-2xl border border-nex-border shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedDocUrl(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center p-4">
              <img
                src={selectedDocUrl}
                alt="Verification Document"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
