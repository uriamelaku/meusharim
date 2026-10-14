import type { LucideIcon } from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { RingsMark } from '@/components/RingsMark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LoadingState({ label = 'טוען…', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-4 py-16', className)}
    >
      <RingsMark className="h-10 animate-pulse" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

type ErrorStateProps = {
  title: string
  description: string
  onRetry?: () => void
  children?: ReactNode
  className?: string
}

export function ErrorState({ title, description, onRetry, children, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {onRetry && <Button onClick={onRetry}>נסו שוב</Button>}
        {children}
      </div>
    </div>
  )
}

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}
