import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getAppSettings, updateAppSetting, type AppSettings } from './api'

interface SettingsContextType {
  settings: AppSettings
  isLoading: boolean
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>
}

const defaultSettings: AppSettings = {
  darkModeEnabled: true,
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getAppSettings()
      .then((data) => {
        setSettings({ ...defaultSettings, ...data })
      })
      .catch((error) => {
        console.error('Failed to fetch settings:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    // Optimistically update local state
    const previousSettings = settings
    setSettings((prev) => ({ ...prev, ...newSettings }))

    // Update each changed setting on the server
    try {
      for (const [key, value] of Object.entries(newSettings)) {
        await updateAppSetting(key, value)
      }
    } catch (error) {
      // Revert on error
      setSettings(previousSettings)
      throw error
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
