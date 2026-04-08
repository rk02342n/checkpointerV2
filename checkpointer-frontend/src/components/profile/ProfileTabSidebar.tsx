import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
      <div className="flex flex-col" style={themeStyle}>
        <div className="flex divide-x-4">
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
        <div className="flex-1 min-w-0 p-6 border-0">
          {children}
        </div>
      </div>
    )
  }

  const activeTabItem = tabs.find((t) => t.id === activeTab)
  const ActiveIcon = activeTabItem?.icon

  return (
    <div className="relative min-h-160" style={themeStyle}>
      {/* Mobile dropdown */}
      <div className="md:hidden mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger className={`flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wide border-4 border-border w-full ${activeClass} text-foreground`}>
            {ActiveIcon && <ActiveIcon className="w-4 h-4 shrink-0" />}
            <span>
              {activeTabItem?.label}{activeTabItem?.count !== undefined ? ` (${activeTabItem.count})` : ''}
            </span>
            <ChevronDown className="w-4 h-4 ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${
                    activeTab === tab.id ? activeClass : ''
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop sidebar — positioned outside the content flow */}
      <div className="hidden md:flex flex-col shrink-0 w-44 absolute right-full top-6 mr-4 border-4 border-border divide-y-4 divide-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide w-full ${
                activeTab === tab.id ? `${activeClass} text-foreground` : inactiveClass
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>
                {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="min-w-0 p-6">
        {children}
      </div>
    </div>
  )
}
