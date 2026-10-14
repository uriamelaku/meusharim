import { cn } from '@/lib/utils'

export type ProgressTone = 'default' | 'warning' | 'over'

type ProgressBarProps = {
  /** 0–100; larger values fill the bar. */
  percent: number
  tone?: ProgressTone
  label: string
  className?: string
}

const TONE_CLASSES: Record<ProgressTone, string> = {
  default: 'bg-primary',
  warning: 'bg-brass',
  over: 'bg-destructive',
}

export function ProgressBar({ percent, tone = 'default', label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', TONE_CLASSES[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
