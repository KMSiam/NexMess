import { useState } from 'react'
import { getInitials } from '../../../lib/utils'
import { UserCheck, UserX, CheckCircle2, Phone, ShieldAlert, FileText, X, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const toggleExpand = (userId: string) => {
    setExpandedUserId(prev => (prev === userId ? null : userId))
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests (Manager) */}
      {isManager && pendingMembers.length > 0 && (
        <div className="nex-card p-6 border border-amber-500/10">
          <h3 className="text-lg font-semibold text-nex-text mb-4 flex items-center gap-2">
            Pending Requests
            <span className="nex-badge nex-badge-danger animate-pulse">{pendingMembers.length}</span>
          </h3>
          <div className="space-y-3">
            {pendingMembers.map(member => {
              const p = member.profiles as any
              return (
                <div
                  key={member.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-nex-elevated rounded-2xl border border-nex-border/80 gap-3 hover:border-nex-border transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {getInitials(p?.username || '?')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-nex-text">{p?.username || 'Unknown'}</p>
                      {p?.contact_no && (
                        <p className="text-xs text-nex-muted font-mono mt-0.5">{p.contact_no}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onApprove(member.user_id)}
                      className="nex-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => onReject(member.user_id)}
                      className="nex-btn-danger text-xs py-2 px-4 flex items-center gap-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none shadow-none"
                    >
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
        <div className="space-y-3">
          {approvedMembers.map(member => {
            const p = member.profiles as any
            const isExpanded = expandedUserId === member.user_id
            return (
              <div
                key={member.user_id}
                className={`border border-nex-border/60 rounded-2xl overflow-hidden transition-all duration-200 ${
                  isExpanded ? 'bg-nex-elevated border-nex-border/100 shadow-md scale-[1.01]' : 'bg-transparent hover:bg-nex-hover/50'
                }`}
              >
                {/* Member Row Header */}
                <div
                  onClick={() => toggleExpand(member.user_id)}
                  className="flex items-center justify-between p-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(p?.username || '?')
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-nex-text flex items-center gap-1.5">
                        {p?.username || 'Unknown'}
                        {p?.is_verified && (
                          <span className="nex-verified">
                            <CheckCircle2 className="w-3.5 h-3.5 text-nex-primary" />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-nex-muted capitalize font-medium">{member.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Compact Quick Indicators */}
                    <div className="hidden sm:flex items-center gap-2 mr-3">
                      {p?.contact_no && (
                        <span className="h-1.5 w-1.5 rounded-full bg-nex-primary" title="Phone number set" />
                      )}
                      {p?.emergency_contact_no && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Emergency contact set" />
                      )}
                      {p?.verification_doc_type && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Verification document set" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-nex-primary bg-nex-primary/10 hover:bg-nex-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                      {isExpanded ? (
                        <>
                          Hide <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Details <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-nex-border/40 p-4 bg-nex-bg/30 space-y-4 animate-slide-down">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Contact Info Group */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-nex-muted uppercase tracking-wider">Contact Information</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-nex-elevated rounded-xl border border-nex-border/50">
                            <span className="text-xs text-nex-muted flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-nex-primary" />
                              Phone Number
                            </span>
                            <span className="text-xs font-semibold text-nex-text font-mono">
                              {p?.contact_no || 'Not set'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                            <span className="text-xs text-red-500 flex items-center gap-1.5 font-medium">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                              Emergency Contact
                            </span>
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400 font-mono">
                              {p?.emergency_contact_no || 'Not set'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Verification Document Group */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-nex-muted uppercase tracking-wider">Verification Document</h4>
                        <div className="p-3 bg-nex-elevated rounded-xl border border-nex-border/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-nex-muted flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-emerald-500" />
                              Document Details
                            </span>
                            {p?.verification_doc_type ? (
                              <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                {p.verification_doc_type === 'nid'
                                  ? 'National ID'
                                  : p.verification_doc_type === 'birth_certificate'
                                  ? 'Birth Cert'
                                  : 'Other'}
                              </span>
                            ) : (
                              <span className="text-xs text-nex-muted">Not uploaded</span>
                            )}
                          </div>

                          {p?.verification_doc_type && (
                            <div className="flex items-center justify-between pt-2 border-t border-nex-border/30 gap-2">
                              <span className="text-[11px] text-nex-muted font-mono truncate">
                                No: {p.verification_doc_no || 'N/A'}
                              </span>
                              {p.verification_doc_url ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocUrl(p.verification_doc_url)}
                                  className="text-xs text-nex-primary hover:text-blue-500 font-bold bg-nex-primary-light px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                >
                                  View Copy
                                </button>
                              ) : (
                                <span className="text-[10px] text-nex-muted italic shrink-0">No image file</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member Actions Row */}
                    {isManager && (
                      <div className="border-t border-nex-border/50 pt-4 flex flex-wrap items-center justify-end gap-2">
                        {member.role === 'member' ? (
                          <button
                            onClick={() => onMakeManager(member.user_id)}
                            className="text-xs font-semibold text-nex-primary hover:text-blue-700 bg-nex-primary-light hover:bg-blue-500/10 px-3.5 py-2 rounded-xl transition-all duration-200"
                          >
                            Promote to Manager
                          </button>
                        ) : (
                          <button
                            onClick={() => onDemoteManager(member.user_id)}
                            className="text-xs font-semibold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2 rounded-xl transition-all duration-200"
                          >
                            Demote to Member
                          </button>
                        )}

                        {member.role !== 'manager' && (
                          <button
                            onClick={() => onRemove(member.user_id)}
                            className="text-xs font-semibold text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 px-3.5 py-2 rounded-xl transition-all duration-200"
                          >
                            Remove Member
                          </button>
                        )}
                      </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity duration-300"
          onClick={() => setSelectedDocUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-nex-bg p-2 rounded-3xl border border-nex-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
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
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
