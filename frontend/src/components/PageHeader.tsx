type PageHeaderProps = { eyebrow?: string; title: string; description?: string }

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="mb-6 lg:mb-8">
      {eyebrow && <p className="mb-1 text-sm font-medium text-brass-strong">{eyebrow}</p>}
      <h1 className="font-heading text-3xl font-semibold tracking-tight lg:text-4xl">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </header>
  )
}
