import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  pending?: boolean
}

/** Asks before a destructive action. Stays open while the action runs. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent className="rounded-2xl p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-lg">{title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-5 -mb-5 rounded-b-2xl">
          <AlertDialogCancel disabled={pending}>ביטול</AlertDialogCancel>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
