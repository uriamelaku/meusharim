import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { changeLanguage, isHebrew } from '@/lib/i18n'

/** Switches the app to the other language (saved on this device). */
export function LanguageToggle({ className }: { className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      lang={isHebrew ? 'en' : 'he'}
      onClick={() => changeLanguage(isHebrew ? 'en' : 'he')}
    >
      <Languages aria-hidden />
      {isHebrew ? 'English' : 'עברית'}
    </Button>
  )
}
