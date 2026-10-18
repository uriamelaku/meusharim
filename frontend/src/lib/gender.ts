import type { Gender } from '@/household/api'

/**
 * Picks the form of a personal sentence for the person it addresses or describes.
 * Without a known gender, `neutral` is used (both forms joined, e.g. "את/ה").
 */
export function byGender(
  gender: Gender | null | undefined,
  forms: { female: string; male: string; neutral?: string },
): string {
  if (gender === 'female') return forms.female
  if (gender === 'male') return forms.male
  return forms.neutral ?? `${forms.male}/${forms.female}`
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'בלשון נקבה (את)' },
  { value: 'male', label: 'בלשון זכר (אתה)' },
]
