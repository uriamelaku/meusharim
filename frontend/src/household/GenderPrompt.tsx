import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { describeError } from '@/lib/errors'
import { GENDER_OPTIONS } from '@/lib/gender'
import { FLAGS, setFlag } from '@/onboarding/storage'
import { type Gender, useUpdateMyGender } from './api'

/** Asks members who joined before gender existed, once, how to address them. */
export function GenderPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const update = useUpdateMyGender()

  function choose(value: Gender) {
    update.mutate(value, {
      onSuccess: onClose,
      onError: (error) => toast.error(describeError(error)),
    })
  }

  function skip() {
    setFlag(FLAGS.genderSkipped)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && skip()}>
      <DialogContent className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">איך לפנות אליך?</DialogTitle>
          <DialogDescription>
            כך ננסח את ההודעות באפליקציה. אפשר לשנות בכל רגע בהגדרות.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              size="lg"
              disabled={update.isPending}
              onClick={() => choose(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
