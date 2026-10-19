import { Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { tr } from '@/lib/i18n'
import { useTour } from './tourContext'
import { FLAGS, hasFlag, setFlag } from './storage'

/** A one-time hint under the category circles, until closed. */
export function RingTip() {
  const [closed, setClosed] = useState(() => hasFlag(FLAGS.ringTipClosed))
  const tour = useTour()
  if (closed || tour.active) return null

  function close() {
    setFlag(FLAGS.ringTipClosed)
    setClosed(true)
  }

  return (
    <div
      role="note"
      className="relative mx-auto flex max-w-sm items-start gap-2 rounded-2xl bg-accent px-3.5 py-2.5 text-sm text-accent-foreground shadow-sm before:absolute before:-top-1.5 before:left-1/2 before:size-3 before:-translate-x-1/2 before:rotate-45 before:bg-accent"
    >
      <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1 leading-snug">
        {tr({
          he: 'לחיצה על עיגול מוסיפה הוצאה בקטגוריה. לחיצה ארוכה מראה מה כבר נרשם בה.',
          en: "Tap a circle to add an expense in that category. Press and hold to see what's already in it.",
        })}
      </p>
      <button
        type="button"
        onClick={close}
        aria-label={tr({ he: 'סגירת הטיפ', en: 'Close tip' })}
        className="-m-1.5 flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
