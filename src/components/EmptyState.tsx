import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-12 text-center ${className}`}
    >
      <div className="bg-nex-elevated mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <Icon className="text-nex-muted/50 h-7 w-7" />
      </div>
      <h3 className="text-nex-text mb-1 text-sm font-semibold">{title}</h3>
      {description && (
        <p className="text-nex-muted max-w-xs text-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
