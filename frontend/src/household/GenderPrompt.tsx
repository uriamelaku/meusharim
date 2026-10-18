import { useState } from 'react'
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
import { type Gender, useUpdateMyGender } from './api'

const SKIPPED_KEY = 'meusharim-gender-prompt-skipped'

function wasSkipped(): boolean {
  try {
    return localStorage.getItem(SKIPPED_KEY) === '1'
  } catch {
    return false
  }
}

function rememberSkip() {
  try {
    localStorage.setItem(SKIPPED_KEY, '1')
  } catch {
    // Not remembered on this device; the question may show again next visit.
  }
}

/** Asks members who joined before gender existed, once, how to address them. */
export function GenderPrompt({ gender }: { gender: Gender | null }) {
  const [open, setOpen] = useState(() => gender === null && !wasSkipped())
  const update = useUpdateMyGender()

  function choose(value: Gender) {
    update.mutate(value, {
      onSuccess: () => setOpen(false),
      onError: (error) => toast.error(describeError(error)),
    })
  }

  function skip() {
    rememberSkip()
    setOpen(false)
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
