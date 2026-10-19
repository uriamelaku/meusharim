import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/** A bottom sheet on phones and a centered dialog from `sm` up. */
export function Sheet({ open, onOpenChange, title, description, children, className }: SheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/25 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-card shadow-2xl outline-none',
            'data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom',
            'sm:inset-x-auto sm:start-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-lg sm:-translate-y-1/2 sm:rounded-3xl sm:ltr:-translate-x-1/2 sm:rtl:translate-x-1/2',
            'sm:data-open:slide-in-from-bottom-4 sm:data-open:fade-in-0',
            className,
          )}
        >
          <div
            className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:px-6 sm:pt-6">
            <div>
              <DialogPrimitive.Title className="font-heading text-xl font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {title}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="-me-2 -mt-1">
                <XIcon className="size-5" />
                <span className="sr-only">{tr({ he: 'סגירה', en: 'Close' })}</span>
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
