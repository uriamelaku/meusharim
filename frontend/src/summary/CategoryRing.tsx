import { createElement } from 'react'
import { Link } from 'react-router'
import { categoryColor, categoryIcon } from '@/categories/appearance'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { RingItem } from './ringItems'

type CategoryRingProps = {
  items: RingItem[]
  total: string
  /** The month's remaining budget, if a budget is set. */
  remaining: string | null
  budgetLink: string
}

/**
 * The month's spending as a ring, with a bubble per category around it (four above,
 * two on each side, the rest below). Arc lengths are visual ratios only; every amount
 * shown as text comes from the server.
 */
export function CategoryRing({ items, total, remaining, budgetLink }: CategoryRingProps) {
  return (
    <section
      aria-label="הוצאות החודש לפי קטגוריה"
      className="grid grid-cols-4 gap-x-1 gap-y-3 rounded-[1.75rem] bg-card px-2 py-4 sm:gap-x-3 sm:px-4"
    >
      <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex items-center justify-center">
        <Donut items={items} total={total} remaining={remaining} />
      </div>
      {items.map((item) => (
        <Bubble key={item.category.id} item={item} to={budgetLink} />
      ))}
    </section>
  )
}

const RADIUS = 70
const STROKE = 18
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3

function Donut({ items, total, remaining }: Omit<CategoryRingProps, 'budgetLink'>) {
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
  const over = remaining?.startsWith('-') ?? false

  return (
    <div className="relative size-40 sm:size-44">
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
        <span className="font-heading text-2xl font-semibold tabular-nums">{formatMoney(total)}</span>
        {remaining !== null && (
          <span className={cn('text-xs font-bold', over ? 'text-destructive' : 'text-primary')}>
            {over ? `חריגה ${formatMoney(remaining.slice(1))}` : `נשארו ${formatMoney(remaining)}`}
          </span>
        )}
      </div>
    </div>
  )
}

function Bubble({ item, to }: { item: RingItem; to: string }) {
  const { category, actual, percent, over } = item
  const color = categoryColor(category.color)
  const idle = actual === '0.00'
  const ring = over
    ? 'var(--destructive)'
    : percent === null
      ? 'var(--muted)'
      : `conic-gradient(${color.ink} ${Math.min(percent, 100)}%, var(--muted) 0)`
  const usage = over ? 'חריגה מהתקציב' : percent === null ? 'ללא תקציב' : `נוצלו ${percent}% מהתקציב`

  return (
    <Link
      to={to}
      aria-label={`${category.name}: ${formatMoney(actual)}, ${usage}`}
      className="flex min-w-0 flex-col items-center gap-1 rounded-2xl py-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="max-w-full truncate text-xs font-semibold text-muted-foreground">
        {category.name}
      </span>
      <span className="flex size-14 rounded-full p-[3px]" style={{ background: ring }} aria-hidden>
        <span
          className="flex size-full items-center justify-center rounded-full border-2 border-card"
          style={{
            backgroundColor: idle ? 'var(--muted)' : color.tint,
            color: idle ? 'var(--muted-foreground)' : color.ink,
          }}
        >
          {createElement(categoryIcon(category.icon), { className: 'size-[22px]' })}
        </span>
      </span>
      <span
        className={cn(
          'font-heading text-sm font-semibold tabular-nums',
          idle && 'text-muted-foreground',
          over && 'text-destructive',
        )}
      >
        {formatMoney(actual)}
      </span>
    </Link>
  )
}
