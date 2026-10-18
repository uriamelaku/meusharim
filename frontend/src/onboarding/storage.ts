/** One-time onboarding flags, remembered per device. */
export const FLAGS = {
  tourDone: 'meusharim-tour-done',
  genderSkipped: 'meusharim-gender-prompt-skipped',
  ringTipClosed: 'meusharim-tip-ring-closed',
} as const

export function hasFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function setFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Not remembered on this device; it may show again next visit.
  }
}
