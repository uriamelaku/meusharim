import type { ReactNode } from 'react'
import { Wordmark } from '@/components/RingsMark'

/** A single centered card, for steps that come before the app itself (setup, invitations). */
export function FocusLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Wordmark className="mb-8" />
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
        {children}
      </div>
      {footer && <div className="mt-6 max-w-md text-center text-sm text-muted-foreground">{footer}</div>}
    </main>
  )
}
