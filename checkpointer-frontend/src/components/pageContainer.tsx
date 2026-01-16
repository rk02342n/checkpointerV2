interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <main className={`min-h-screen bg-background ${className}`}>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {children}
      </div>
    </main>
  )
}
