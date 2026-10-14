import { createElement } from 'react'
import { cn } from '@/lib/utils'
import { categoryColor, categoryIcon } from './appearance'

type CategoryIconBadgeProps = { color: string; icon: string; className?: string }

/** The category's icon on its tinted circle. Decorative: the name is always shown next to it. */
export function CategoryIconBadge({ color, icon, className }: CategoryIconBadgeProps) {
  const { tint, ink } = categoryColor(color)
  return (
    <span
      aria-hidden
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', className)}
      style={{ backgroundColor: tint, color: ink }}
    >
      {createElement(categoryIcon(icon), { className: 'size-[55%]' })}
    </span>
  )
}
