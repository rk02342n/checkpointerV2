import type { LucideIcon } from 'lucide-react'

export interface ProfileTabItem {
  id: string
  label: string
  icon: LucideIcon
  count?: number
}

interface ProfileTabSidebarProps {
  tabs: ProfileTabItem[]
  activeTab: string
  onTabChange: (tab: string) => void
  themed: boolean
  themeStyle?: React.CSSProperties
  layout?: 'sidebar' | 'bar'
  children: React.ReactNode
}

export function ProfileTabSidebar({
  tabs,
  activeTab,
  onTabChange,
  themed,
  themeStyle,
  layout = 'sidebar',
  children,
}: ProfileTabSidebarProps) {
  const activeClass = themed ? 'profile-accent' : 'bg-amber-200 dark:bg-amber-900'
  const inactiveClass = `cursor-pointer ${themed ? 'profile-accent-muted text-foreground hover:opacity-80' : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'}`

  if (layout === 'bar') {
    return (
      <div className="border-4 border-border flex flex-col" style={themeStyle}>
        <div className="flex divide-x-4 divide-border">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wide ${
                  activeTab === tab.id ? `${activeClass} text-foreground` : inactiveClass
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">
                  {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex-1 min-w-0 p-6 border-t-4 border-border">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="border-4 border-border flex" style={themeStyle}>
      <div className="flex flex-col shrink-0 w-12 md:w-44 border-r-4 border-border divide-y-4 divide-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3 text-sm font-bold uppercase tracking-wide w-full ${
                activeTab === tab.id ? `${activeClass} text-foreground` : inactiveClass
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">
                {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex-1 min-w-0 p-6">
        {children}
      </div>
    </div>
  )
}
