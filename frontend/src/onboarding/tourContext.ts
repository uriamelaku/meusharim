import { createContext, use } from 'react'

export type TourControls = {
  start: () => void
  /** Starts the tour unless it was already seen on this device. */
  startOnce: () => void
  active: boolean
}

export const TourContext = createContext<TourControls | null>(null)

export function useTour(): TourControls {
  const tour = use(TourContext)
  if (!tour) throw new Error('useTour must be used inside TourProvider')
  return tour
}
