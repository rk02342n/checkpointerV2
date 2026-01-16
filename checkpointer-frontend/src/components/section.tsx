interface SectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function Section({ title, children, className = "" }: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
