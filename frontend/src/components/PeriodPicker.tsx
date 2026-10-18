import { CalendarCheck, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  formatPeriod,
  isSamePeriod,
  isWithinBounds,
  MAX_YEAR,
  MIN_YEAR,
  monthName,
  type Period,
  shiftMonths,
  YEARS_PER_PAGE,
  yearPageStart,
} from '@/lib/period'
import { cn } from '@/lib/utils'

type PeriodPickerProps = {
  period: Period
  today: Period
  onChange: (period: Period) => void
  /** A small pill for tight headers (the main screen) instead of a page title. */
  compact?: boolean
}

/*
 * RTL: time flows right to left, so the right-hand arrow (first in the DOM) goes back
 * in time and the left-hand arrow goes forward.
 */
export function PeriodPicker({ period, today, onChange, compact = false }: PeriodPickerProps) {
  const [open, setOpen] = useState(false)
  const previous = shiftMonths(period, -1)
  const next = shiftMonths(period, 1)

  function select(nextPeriod: Period) {
    onChange(nextPeriod)
    setOpen(false)
  }

  return (
    <div className={cn('flex items-center gap-1', compact && 'gap-0 rounded-full bg-card p-1')}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(compact && 'size-10 rounded-full text-primary')}
        aria-label={`החודש הקודם: ${formatPeriod(previous)}`}
        disabled={!isWithinBounds(previous)}
        onClick={() => onChange(previous)}
      >
        <ChevronRight className="size-6" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${formatPeriod(period)}, בחירת חודש ושנה`}
            className={cn(
              'flex h-12 min-w-0 items-center gap-1.5 rounded-xl px-2 font-heading text-[1.75rem] leading-none font-semibold tracking-tight transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:text-4xl',
              compact && 'h-10 rounded-full px-2 text-lg lg:text-xl',
            )}
          >
            <span className="truncate">{formatPeriod(period)}</span>
            <ChevronDown
              className={cn('size-5 shrink-0 text-muted-foreground', compact && 'size-4')}
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          collisionPadding={16}
          className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl p-3"
        >
          <MonthYearPanel period={period} today={today} onSelect={select} />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className={cn(compact && 'size-10 rounded-full text-primary')}
        aria-label={`החודש הבא: ${formatPeriod(next)}`}
        disabled={!isWithinBounds(next)}
        onClick={() => onChange(next)}
      >
        <ChevronLeft className="size-6" />
      </Button>
    </div>
  )
}

type MonthYearPanelProps = {
  period: Period
  today: Period
  onSelect: (period: Period) => void
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

function MonthYearPanel({ period, today, onSelect }: MonthYearPanelProps) {
  const [view, setView] = useState<'months' | 'years'>('months')
  const [viewYear, setViewYear] = useState(period.year)
  const pageStart = yearPageStart(viewYear)
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStart + index)
  // Months view steps one year; years view steps a whole page of years.
  const step = view === 'months' ? 1 : YEARS_PER_PAGE
  const firstShown = view === 'months' ? viewYear : pageStart
  const lastShown = view === 'months' ? viewYear : pageStart + YEARS_PER_PAGE - 1
  const canGoBack = firstShown > MIN_YEAR
  const canGoForward = lastShown < MAX_YEAR

  function moveYear(direction: -1 | 1) {
    setViewYear((year) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, year + direction * step)))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label={view === 'months' ? 'השנה הקודמת' : 'שנים קודמות'}
          disabled={!canGoBack}
          onClick={() => moveYear(-1)}
        >
          <ChevronRight className="size-5" />
        </Button>
        <Button
          variant="ghost"
          className="font-heading text-xl font-semibold"
          aria-label={view === 'months' ? `${viewYear}, בחירת שנה` : 'חזרה לבחירת חודש'}
          onClick={() => setView(view === 'months' ? 'years' : 'months')}
        >
          {/* LTR so the range reads 2016–2027, not reversed by the RTL layout. */}
          <bdi dir="ltr">{view === 'months' ? viewYear : `${years[0]}–${years[years.length - 1]}`}</bdi>
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform', view === 'years' && 'rotate-180')}
            aria-hidden
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={view === 'months' ? 'השנה הבאה' : 'שנים הבאות'}
          disabled={!canGoForward}
          onClick={() => moveYear(1)}
        >
          <ChevronLeft className="size-5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {view === 'months'
          ? MONTHS.map((month) => {
              const option = { year: viewYear, month }
              return (
                <GridOption
                  key={month}
                  label={monthName(month)}
                  selected={isSamePeriod(option, period)}
                  isToday={isSamePeriod(option, today)}
                  onClick={() => onSelect(option)}
                />
              )
            })
          : years.map((year) => (
              <GridOption
                key={year}
                label={String(year)}
                selected={year === period.year}
                isToday={year === today.year}
                disabled={year < MIN_YEAR || year > MAX_YEAR}
                onClick={() => {
                  setViewYear(year)
                  setView('months')
                }}
              />
            ))}
      </div>

      <Button variant="ghost" className="text-brass-strong" onClick={() => onSelect(today)}>
        <CalendarCheck aria-hidden />
        החודש הנוכחי
      </Button>
    </div>
  )
}

type GridOptionProps = {
  label: string
  selected: boolean
  isToday: boolean
  disabled?: boolean
  onClick: () => void
}

function GridOption({ label, selected, isToday, disabled, onClick }: GridOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        'h-11 rounded-xl text-sm font-medium tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted',
        isToday && !selected && 'text-brass-strong ring-1 ring-brass ring-inset',
      )}
    >
      {label}
    </button>
  )
}
