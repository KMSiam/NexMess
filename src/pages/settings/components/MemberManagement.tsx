import { useState } from 'react'
import { getInitials } from '../../../lib/utils'
import {
  UserCheck,
  UserX,
  CheckCircle2,
  Phone,
  ShieldAlert,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
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
    setExpandedUserId((prev) => (prev === userId ? null : userId))
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests (Manager) */}
      {isManager && pendingMembers.length > 0 && (
        <div className="nex-card border border-amber-500/10 p-6">
          <h3 className="text-nex-text mb-4 flex items-center gap-2 text-lg font-semibold">
            Pending Requests
            <span className="nex-badge nex-badge-danger animate-pulse">
              {pendingMembers.length}
            </span>
          </h3>
          <div className="space-y-3">
            {pendingMembers.map((member) => {
              const p = member.profiles as any
              return (
                <div
                  key={member.user_id}
                  className="bg-nex-elevated border-nex-border/80 hover:border-nex-border flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-sm font-semibold text-white">
                      {getInitials(p?.username || '?')}
                    </div>
                    <div>
                      <p className="text-nex-text text-sm font-semibold">
                        {p?.username || 'Unknown'}
                      </p>
                      {p?.contact_no && (
                        <p className="text-nex-muted mt-0.5 font-mono text-xs">{p.contact_no}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onApprove(member.user_id)}
                      className="nex-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs shadow-sm"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => onReject(member.user_id)}
                      className="nex-btn-danger flex items-center gap-1.5 border-none bg-red-500/10 px-4 py-2 text-xs text-red-500 shadow-none hover:bg-red-500 hover:text-white"
                    >
                      <UserX className="h-3.5 w-3.5" /> Reject
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
        <h3 className="text-nex-text mb-4 text-lg font-semibold">
          Members ({approvedMembers.length})
        </h3>
        <div className="space-y-3">
          {approvedMembers.map((member) => {
            const p = member.profiles as any
            const isExpanded = expandedUserId === member.user_id
            return (
              <div
                key={member.user_id}
                className={`border-nex-border/60 overflow-hidden rounded-2xl border transition-all duration-200 ${
                  isExpanded
                    ? 'bg-nex-elevated border-nex-border/100 scale-[1.01] shadow-md'
                    : 'hover:bg-nex-hover/50 bg-transparent'
                }`}
              >
                {/* Member Row Header */}
                <div
                  onClick={() => toggleExpand(member.user_id)}
                  className="flex cursor-pointer items-center justify-between p-4 select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        getInitials(p?.username || '?')
                      )}
                    </div>
                    <div>
                      <p className="text-nex-text flex items-center gap-1.5 text-sm font-semibold">
                        {p?.username || 'Unknown'}
                        {p?.is_verified && (
                          <span className="nex-verified">
                            <CheckCircle2 className="text-nex-primary h-3.5 w-3.5" />
                          </span>
                        )}
                      </p>
                      <p className="text-nex-muted text-xs font-medium capitalize">{member.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Compact Quick Indicators */}
                    <div className="mr-3 hidden items-center gap-2 sm:flex">
                      {p?.contact_no && (
                        <span
                          className="bg-nex-primary h-1.5 w-1.5 rounded-full"
                          title="Phone number set"
                        />
                      )}
                      {p?.emergency_contact_no && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-red-500"
                          title="Emergency contact set"
                        />
                      )}
                      {p?.verification_doc_type && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                          title="Verification document set"
                        />
                      )}
                    </div>
                    <span className="text-nex-primary bg-nex-primary/10 hover:bg-nex-primary/20 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors">
                      {isExpanded ? (
                        <>
                          Hide <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Details <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-nex-border/40 bg-nex-bg/30 animate-slide-down space-y-4 border-t p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Contact Info Group */}
                      <div className="space-y-2">
                        <h4 className="text-nex-muted text-[10px] font-bold tracking-wider uppercase">
                          Contact Information
                        </h4>
                        <div className="space-y-2">
                          <div className="bg-nex-elevated border-nex-border/50 flex items-center justify-between rounded-xl border p-3">
                            <span className="text-nex-muted flex items-center gap-1.5 text-xs">
                              <Phone className="text-nex-primary h-3.5 w-3.5" />
                              Phone Number
                            </span>
                            <span className="text-nex-text font-mono text-xs font-semibold">
                              {p?.contact_no || 'Not set'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-xl border border-red-500/10 bg-red-500/5 p-3">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                              Emergency Contact
                            </span>
                            <span className="font-mono text-xs font-semibold text-red-600 dark:text-red-400">
                              {p?.emergency_contact_no || 'Not set'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Verification Document Group */}
                      <div className="space-y-2">
                        <h4 className="text-nex-muted text-[10px] font-bold tracking-wider uppercase">
                          Verification Document
                        </h4>
                        <div className="bg-nex-elevated border-nex-border/50 space-y-3 rounded-xl border p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-nex-muted flex items-center gap-1.5 text-xs">
                              <FileText className="h-3.5 w-3.5 text-emerald-500" />
                              Document Details
                            </span>
                            {p?.verification_doc_type ? (
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 uppercase dark:text-emerald-400">
                                {p.verification_doc_type === 'nid'
                                  ? 'National ID'
                                  : p.verification_doc_type === 'birth_certificate'
                                    ? 'Birth Cert'
                                    : 'Other'}
                              </span>
                            ) : (
                              <span className="text-nex-muted text-xs">Not uploaded</span>
                            )}
                          </div>

                          {p?.verification_doc_type && (
                            <div className="border-nex-border/30 flex items-center justify-between gap-2 border-t pt-2">
                              <span className="text-nex-muted truncate font-mono text-[11px]">
                                No: {p.verification_doc_no || 'N/A'}
                              </span>
                              {p.verification_doc_url ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocUrl(p.verification_doc_url)}
                                  className="text-nex-primary bg-nex-primary-light flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors hover:text-blue-500"
                                >
                                  View Copy
                                </button>
                              ) : (
                                <span className="text-nex-muted shrink-0 text-[10px] italic">
                                  No image file
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member Actions Row */}
                    {isManager && (
                      <div className="border-nex-border/50 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                        {member.role === 'member' ? (
                          <button
                            onClick={() => onMakeManager(member.user_id)}
                            className="text-nex-primary bg-nex-primary-light rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 hover:bg-blue-500/10 hover:text-blue-700"
                          >
                            Promote to Manager
                          </button>
                        ) : (
                          <button
                            onClick={() => onDemoteManager(member.user_id)}
                            className="rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-500 transition-all duration-200 hover:bg-amber-500/20 hover:text-amber-400"
                          >
                            Demote to Member
                          </button>
                        )}

                        {member.role !== 'manager' && (
                          <button
                            onClick={() => onRemove(member.user_id)}
                            className="rounded-xl bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-500 transition-all duration-200 hover:bg-red-500 hover:text-white"
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
            className="bg-nex-bg border-nex-border animate-in fade-in zoom-in-95 relative w-full max-w-3xl overflow-hidden rounded-3xl border p-2 shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDocUrl(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-4">
              <img
                src={selectedDocUrl}
                alt="Verification Document"
                className="max-h-[70vh] max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
