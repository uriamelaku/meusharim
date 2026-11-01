import { createElement, type PointerEvent, useEffect, useRef, useState } from 'react'
import { categoryColor, categoryIcon } from '@/categories/appearance'
import { tr } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { RingItem } from './ringItems'

type CategoryRingProps = {
  items: RingItem[]
  total: string
  /** Opens a new expense in this category. */
  onAdd: (categoryId: string) => void
  /** Opens this category's transactions (long press or right click). */
  onOpen: (categoryId: string) => void
  /** While set, bubbles are dragged to a new place instead of tapped. */
  onMove?: (movedId: string, targetId: string) => void
}

/**
 * The month's spending as a ring, with a bubble per category around it: five above,
 * one on each side for two rows, the rest below. Arc lengths are visual ratios only;
 * every amount shown as text comes from the server.
 */
export function CategoryRing({ items, total, onAdd, onOpen, onMove }: CategoryRingProps) {
  const drag = useBubbleDrag(onMove)
  return (
    <section
      aria-label={tr({ he: 'הוצאות החודש לפי קטגוריה', en: "This month's expenses by category" })}
      className="grid grid-cols-5 gap-x-0.5 gap-y-2.5 rounded-[1.6rem] bg-card px-1.5 py-3.5 sm:gap-x-3 sm:px-4"
    >
      <div className="col-span-3 col-start-2 row-span-2 row-start-2 flex items-center justify-center">
        <Donut items={items} total={total} />
      </div>
      {items.map((item) =>
        onMove ? (
          <DraggableBubble key={item.category.id} item={item} drag={drag} />
        ) : (
          <Bubble key={item.category.id} item={item} onAdd={onAdd} onOpen={onOpen} />
        ),
      )}
      {drag.state && (
        <DragGhost item={items.find((i) => i.category.id === drag.state?.id)} drag={drag.state} />
      )}
    </section>
  )
}

const RADIUS = 70
const STROKE = 17
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3

function Donut({ items, total }: Pick<CategoryRingProps, 'items' | 'total'>) {
  const sum = items.reduce((acc, item) => acc + Number(item.actual), 0)
  let offset = 0
  const arcs = sum
    ? items
        .filter((item) => item.actual !== '0.00')
        .map((item) => {
          const length = (Number(item.actual) / sum) * CIRCUMFERENCE
          const arc = { item, length, offset }
          offset += length
          return arc
        })
    : []

  return (
    <div className="relative size-36 sm:size-44">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90" aria-hidden>
        <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={STROKE} />
        {arcs.map(({ item, length, offset: start }) => (
          <circle
            key={item.category.id}
            cx="90"
            cy="90"
            r={RADIUS}
            fill="none"
            stroke={categoryColor(item.category.color).solid}
            strokeWidth={STROKE}
            strokeDasharray={`${Math.max(length - (arcs.length > 1 ? GAP : 0), 0.5)} ${CIRCUMFERENCE}`}
            strokeDashoffset={-start}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-semibold text-muted-foreground">
          {tr({ he: 'הוצאות', en: 'Expenses' })}
        </span>
        <span className="font-heading text-xl font-semibold tabular-nums sm:text-2xl">
          {formatMoney(total)}
        </span>
      </div>
    </div>
  )
}

const LONG_PRESS_MS = 500

type BubbleProps = Pick<CategoryRingProps, 'onAdd' | 'onOpen'> & { item: RingItem }

function Bubble({ item, onAdd, onOpen }: BubbleProps) {
  const { category, actual, percent, over } = item
  const { fired, ...longPressHandlers } = useLongPress(() => onOpen(category.id))
  const usage = over
    ? tr({ he: 'חריגה מהתקציב', en: 'over budget' })
    : percent === null
      ? tr({ he: 'ללא תקציב', en: 'no budget' })
      : tr({ he: `נוצלו ${percent}% מהתקציב`, en: `${percent}% of the budget used` })

  return (
    <button
      type="button"
      {...longPressHandlers}
      onClick={() => !fired() && onAdd(category.id)}
      aria-label={tr({
        he: `הוספת הוצאה ב${category.name} (עד עכשיו ${formatMoney(actual)}, ${usage})`,
        en: `Add an expense in ${category.name} (${formatMoney(actual)} so far, ${usage})`,
      })}
      className="flex min-w-0 touch-manipulation flex-col items-center rounded-2xl py-0.5 transition-transform select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95"
    >
      <BubbleFace item={item} />
    </button>
  )
}

/** The bubble's look: icon with a budget ring, name and amount. */
function BubbleFace({ item }: { item: RingItem }) {
  const { category, actual, percent, over } = item
  const color = categoryColor(category.color)
  const ring = over
    ? 'var(--destructive)'
    : percent === null
      ? color.tint
      : `conic-gradient(${color.ink} ${Math.min(percent, 100)}%, ${color.tint} 0)`

  return (
    <>
      <span className="flex size-12 rounded-full p-[3px]" style={{ background: ring }} aria-hidden>
        <span
          className="flex size-full items-center justify-center rounded-full border-2 border-card"
          style={{ backgroundColor: color.tint, color: color.ink }}
        >
          {createElement(categoryIcon(category.icon), { className: 'size-5' })}
        </span>
      </span>
      <span className="mt-1 max-w-full truncate text-[11px] leading-tight font-semibold text-muted-foreground">
        {category.name}
      </span>
      <span
        className={cn(
          'font-heading text-[13px] leading-tight font-semibold tabular-nums',
          over && 'text-destructive',
        )}
      >
        {formatMoney(actual)}
      </span>
    </>
  )
}

type DragState = {
  id: string
  x: number
  y: number
  width: number
  offsetX: number
  offsetY: number
}

/**
 * Drag with pointer events (finger or mouse). The bubble under the pointer swaps places
 * with the dragged one as it passes, so the ring shows the new order while dragging.
 * Moves are followed on the window: reordering moves the bubbles' DOM nodes, which would
 * drop a pointer capture on the dragged one.
 */
function useBubbleDrag(onMove: CategoryRingProps['onMove']) {
  const [state, setState] = useState<DragState | null>(null)
  const dragging = state !== null
  const draggedId = state?.id
  const onMoveRef = useRef(onMove)
  useEffect(() => {
    onMoveRef.current = onMove
  })

  useEffect(() => {
    if (!dragging) return
    // Several moves can arrive before the new order is drawn; act once per bubble entered.
    let lastHovered: string | undefined = draggedId
    function move(event: globalThis.PointerEvent) {
      setState((current) => current && { ...current, x: event.clientX, y: event.clientY })
      const hovered = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-bubble-id]')?.dataset.bubbleId
      if (hovered === lastHovered) return
      lastHovered = hovered
      if (draggedId && hovered && hovered !== draggedId) onMoveRef.current?.(draggedId, hovered)
    }
    const end = () => setState(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging, draggedId])

  function start(id: string, event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    setState({
      id,
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    })
  }

  return { state, start }
}

type BubbleDrag = ReturnType<typeof useBubbleDrag>

function DraggableBubble({ item, drag }: { item: RingItem; drag: BubbleDrag }) {
  const id = item.category.id
  return (
    <div
      data-bubble-id={id}
      aria-label={item.category.name}
      onPointerDown={(event) => drag.start(id, event)}
      className={cn(
        'flex min-w-0 cursor-grab touch-none flex-col items-center rounded-2xl py-0.5 outline-2 outline-offset-[-2px] outline-border outline-dashed select-none [-webkit-touch-callout:none]',
        drag.state?.id === id && 'opacity-30',
      )}
    >
      <BubbleFace item={item} />
    </div>
  )
}

/** The dragged bubble, following the pointer above everything else. */
function DragGhost({ item, drag }: { item: RingItem | undefined; drag: DragState }) {
  if (!item) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 flex scale-110 cursor-grabbing flex-col items-center rounded-2xl bg-card py-0.5 shadow-lg"
      style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width }}
    >
      <BubbleFace item={item} />
    </div>
  )
}

/**
 * Long press (touch) or right click (mouse) without triggering the normal click.
 * Touch devices fire a click after the press ends; `fired()` tells the click to skip it.
 */
function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | undefined>(undefined)
  const firedRef = useRef(false)
  const cancel = () => window.clearTimeout(timer.current)
  return {
    onPointerDown: () => {
      firedRef.current = false
      cancel()
      timer.current = window.setTimeout(() => {
        firedRef.current = true
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: { preventDefault: () => void }) => {
      event.preventDefault()
      if (!firedRef.current) {
        cancel()
        firedRef.current = true
        onLongPress()
      }
    },
    fired: () => {
      const fired = firedRef.current
      firedRef.current = false
      return fired
    },
  }
}
