import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { FLAGS, hasFlag, setFlag } from './storage'
import type { TourStep } from './steps'
import { TourContext } from './tourContext'

type TourProviderProps = {
  steps: TourStep[]
  /** Open right away, for someone who has not seen the tour on this device. */
  autoStart: boolean
  children: ReactNode
}

export function TourProvider({ steps, autoStart, children }: TourProviderProps) {
  const [index, setIndex] = useState<number | null>(() =>
    autoStart && !hasFlag(FLAGS.tourDone) ? 0 : null,
  )
  const navigate = useNavigate()

  const goTo = useCallback(
    (next: number) => {
      setIndex(next)
      void navigate(steps[next].route)
    },
    [navigate, steps],
  )

  const start = useCallback(() => goTo(0), [goTo])
  const startOnce = useCallback(() => {
    if (!hasFlag(FLAGS.tourDone)) start()
  }, [start])

  const finish = useCallback(() => {
    setFlag(FLAGS.tourDone)
    setIndex(null)
    void navigate('/')
  }, [navigate])

  const controls = useMemo(
    () => ({ start, startOnce, active: index !== null }),
    [start, startOnce, index],
  )

  return (
    <TourContext value={controls}>
      {children}
      {index !== null && (
        <TourOverlay
          key={index}
          step={steps[index]}
          position={index}
          count={steps.length}
          onNext={() => (index + 1 < steps.length ? goTo(index + 1) : finish())}
          onBack={() => goTo(index - 1)}
          onClose={finish}
        />
      )}
    </TourContext>
  )
}

const PADDING = 6

/** The visible element with this `data-tour` (desktop and phone layouts both have some). */
function findTarget(name: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`)
  return [...all].find((element) => element.getClientRects().length > 0) ?? null
}

/** Follows the target's position, which appears only after the screen renders. */
function useTargetRect(target: string | undefined): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!target) return
    let scrolled = false
    const measure = () => {
      const element = findTarget(target)
      if (element && !scrolled) {
        element.scrollIntoView({ block: 'center', behavior: 'smooth' })
        scrolled = true
      }
      setRect(element?.getBoundingClientRect() ?? null)
    }
    const first = window.requestAnimationFrame(measure)
    const timer = window.setInterval(measure, 150)
    return () => {
      window.cancelAnimationFrame(first)
      window.clearInterval(timer)
    }
  }, [target])
  return rect
}

const CARD_ROOM = 240
const GAP = PADDING + 12

/** Next to the target where there is room, else over its lower edge, else centered. */
function cardPosition(rect: DOMRect | null): CSSProperties {
  if (!rect) return { top: '50%', transform: 'translateY(-50%)' }
  const below = window.innerHeight - rect.bottom
  if (below >= CARD_ROOM && below >= rect.top) return { top: rect.bottom + GAP }
  if (rect.top >= CARD_ROOM) return { bottom: window.innerHeight - rect.top + GAP }
  if (below >= CARD_ROOM) return { top: rect.bottom + GAP }
  return { bottom: 16 }
}

type TourOverlayProps = {
  step: TourStep
  position: number
  count: number
  onNext: () => void
  onBack: () => void
  onClose: () => void
}

function TourOverlay({ step, position, count, onNext, onBack, onClose }: TourOverlayProps) {
  const rect = useTargetRect(step.target)
  const isLast = position === count - 1

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const cardStyle = cardPosition(rect)

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-labelledby="tour-title">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-3xl shadow-[0_0_0_9999px_rgb(0_0_0/0.6)] ring-2 ring-brass transition-all duration-200"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-black/60" />
      )}
      <div
        className="fixed inset-x-4 mx-auto max-w-sm rounded-2xl bg-card p-4 text-card-foreground shadow-xl"
        style={cardStyle}
      >
        <p className="text-xs font-semibold text-muted-foreground">
          {position + 1} מתוך {count}
        </p>
        <h2 id="tour-title" className="mt-0.5 font-heading text-lg font-semibold">
          {step.title}
        </h2>
        <p className="mt-1 leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={onNext} autoFocus>
            {position === 0 ? 'בואו נתחיל' : isLast ? 'סיום' : 'הבא'}
          </Button>
          {position > 0 && (
            <Button variant="ghost" onClick={onBack}>
              הקודם
            </Button>
          )}
          {!isLast && (
            <Button variant="ghost" className="ms-auto text-muted-foreground" onClick={onClose}>
              {position === 0 ? 'לא עכשיו' : 'יציאה'}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
