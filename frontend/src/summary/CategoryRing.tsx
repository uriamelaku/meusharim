import { createElement, useRef } from 'react'
import { categoryColor, categoryIcon } from '@/categories/appearance'
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
}

/**
 * The month's spending as a ring, with a bubble per category around it: five above,
 * one on each side for two rows, the rest below. Arc lengths are visual ratios only;
 * every amount shown as text comes from the server.
 */
export function CategoryRing({ items, total, onAdd, onOpen }: CategoryRingProps) {
  return (
    <section
      aria-label="הוצאות החודש לפי קטגוריה"
      className="grid grid-cols-5 gap-x-0.5 gap-y-2.5 rounded-[1.6rem] bg-card px-1.5 py-3.5 sm:gap-x-3 sm:px-4"
    >
      <div className="col-span-3 col-start-2 row-span-2 row-start-2 flex items-center justify-center">
        <Donut items={items} total={total} />
      </div>
      {items.map((item) => (
        <Bubble key={item.category.id} item={item} onAdd={onAdd} onOpen={onOpen} />
      ))}
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
        <span className="text-xs font-semibold text-muted-foreground">הוצאות</span>
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
  const longPress = useLongPress(() => onOpen(category.id))
  const color = categoryColor(category.color)
  const ring = over
    ? 'var(--destructive)'
    : percent === null
      ? color.tint
      : `conic-gradient(${color.ink} ${Math.min(percent, 100)}%, ${color.tint} 0)`
  const usage = over ? 'חריגה מהתקציב' : percent === null ? 'ללא תקציב' : `נוצלו ${percent}% מהתקציב`

  return (
    <button
      type="button"
      {...longPress}
      onClick={() => !longPress.fired() && onAdd(category.id)}
      aria-label={`הוספת הוצאה ב${category.name} (עד עכשיו ${formatMoney(actual)}, ${usage})`}
      className="flex min-w-0 touch-manipulation flex-col items-center rounded-2xl py-0.5 transition-transform select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95"
    >
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
    </button>
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
