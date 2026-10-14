import { useId } from 'react'
import { cn } from '@/lib/utils'

type RingsMarkProps = {
  className?: string
  firstRing?: string
  secondRing?: string
}

/** The Meusharim mark: two interlocking rings, one for each partner. */
export function RingsMark({
  className,
  firstRing = 'var(--primary)',
  secondRing = 'var(--brass)',
}: RingsMarkProps) {
  const clipId = useId()
  return (
    <svg viewBox="0 0 48 32" fill="none" strokeWidth={3.5} aria-hidden className={cn('h-8', className)}>
      <defs>
        {/* Area around the lower crossing, where the second ring passes over the first. */}
        <clipPath id={clipId}>
          <rect x="19" y="20" width="10" height="12" />
        </clipPath>
      </defs>
      <circle cx="30" cy="16" r="11" stroke={secondRing} />
      <circle cx="18" cy="16" r="11" stroke={firstRing} />
      <circle cx="30" cy="16" r="11" stroke={secondRing} clipPath={`url(#${clipId})`} />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <RingsMark className="h-7" />
      <span className="font-heading text-2xl font-semibold tracking-tight">מאושרים</span>
    </span>
  )
}
