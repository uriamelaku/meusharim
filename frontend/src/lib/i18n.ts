/**
 * The interface language, chosen per device (like the theme). It is fixed for the life of
 * the page: changing it saves the choice and reloads, so every text, formatter and the
 * layout direction switch together.
 *
 * Texts live next to the code that shows them, in both languages: `tr({ he, en })`.
 * TypeScript requires both, so no screen can miss a translation.
 */

export type Language = 'he' | 'en'

const STORAGE_KEY = 'meusharim-language'

function storedLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'he'
  } catch {
    return 'he' // Storage can be blocked (private mode); the default still works.
  }
}

export const language: Language = storedLanguage()

export const isHebrew = language === 'he'

export const direction: 'rtl' | 'ltr' = isHebrew ? 'rtl' : 'ltr'

/** Locale for Intl formatting: dates and shekel amounts in the chosen language. */
export const locale = isHebrew ? 'he-IL' : 'en-IL'

/** The text in the current language. */
export function tr<T>(texts: Record<Language, T>): T {
  return texts[language]
}

/** Sets `lang`, `dir` and the title on the page, before the first paint. */
export function applyLanguage() {
  document.documentElement.lang = language
  document.documentElement.dir = direction
  document.title = tr({ he: 'מאושרים', en: 'Meusharim' })
}

/** Remembers the language on this device and reloads the app in it. */
export function changeLanguage(next: Language) {
  if (next === language) return
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    return // Cannot be saved on this device, so a reload would come back unchanged.
  }
  window.location.reload()
}

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'he', label: 'עברית' },
  { value: 'en', label: 'English' },
]
