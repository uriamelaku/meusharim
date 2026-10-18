import { useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'meusharim-theme'
const THEME_COLORS: Record<Theme, string> = { light: '#fff6ea', dark: '#0f1a15' }

/** The theme chosen on this device; light until the user switches. */
export function storedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light' // Storage can be blocked (private mode); the default still works.
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

/** The current theme and a setter that applies it and remembers it on this device. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState(storedTheme)
  function change(next: Theme) {
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not saved on this device; the switch still applies until reload.
    }
  }
  return [theme, change]
}
