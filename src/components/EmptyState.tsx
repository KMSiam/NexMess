import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-nex-elevated flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-nex-muted/50" />
      </div>
      <h3 className="text-sm font-semibold text-nex-text mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-nex-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
