import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import {
  currentPeriod,
  isSamePeriod,
  type Period,
  parsePeriodParam,
  toPeriodParam,
} from '@/lib/period'

const PARAM = 'month'

/**
 * The month shown on the dashboard, kept in the URL (?month=2026-10) so refresh,
 * back/forward and links keep it. No parameter means the current month.
 */
export function useSelectedPeriod() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = currentPeriod()
  const period = parsePeriodParam(searchParams.get(PARAM)) ?? today

  const setPeriod = useCallback(
    (next: Period) =>
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous)
        if (isSamePeriod(next, currentPeriod())) params.delete(PARAM)
        else params.set(PARAM, toPeriodParam(next))
        return params
      }),
    [setSearchParams],
  )

  return { period, today, setPeriod, isCurrent: isSamePeriod(period, today) }
}
