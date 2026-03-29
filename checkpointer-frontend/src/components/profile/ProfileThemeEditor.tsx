import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePostHog } from 'posthog-js/react'
import { Loader2, RotateCcw, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { updateUserProfile } from '@/lib/api'
import { getProfileHeaderStyle, getProfileContentStyle } from '@/lib/profileTheme'
import { useProfileFont } from '@/lib/useProfileFont'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ALLOWED_FONTS, FONT_SIZES, type ProfileTheme } from '../../../../server/lib/profileThemeConstants'

interface ProfileThemeEditorProps {
  currentTheme: ProfileTheme | null | undefined
}

function ColorPicker({ label, value, onChange, placeholder, hint }: {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 border-4 border-border cursor-pointer bg-transparent p-0"
        />
        <Input
          value={value}
          onChange={(e) => {
            const val = e.target.value
            if (val === '' || /^#[0-9a-fA-F]{0,6}$/.test(val)) onChange(val)
          }}
          placeholder={placeholder}
          maxLength={7}
          className="bg-input border-4 border-border rounded-none font-mono text-sm flex-1"
        />
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function ProfileThemeEditor({ currentTheme }: ProfileThemeEditorProps) {
  const queryClient = useQueryClient()
  const posthog = usePostHog()

  const [backgroundColor, setBackgroundColor] = useState(currentTheme?.backgroundColor ?? '')
  const [headerColor, setHeaderColor] = useState(currentTheme?.headerColor ?? '#dbeafe')
  const [headerFontColor, setHeaderFontColor] = useState(currentTheme?.headerFontColor ?? '')
  const [contentFontColor, setContentFontColor] = useState(currentTheme?.contentFontColor ?? '')
  const [cardColor, setCardColor] = useState(currentTheme?.cardColor ?? '')
  const [accentColor, setAccentColor] = useState(currentTheme?.accentColor ?? '')
  const [fontFamily, setFontFamily] = useState(currentTheme?.fontFamily ?? '')
  const [fontSize, setFontSize] = useState<ProfileTheme['fontSize']>(currentTheme?.fontSize ?? 'base')

  // Sync form when account data loads/changes
  useEffect(() => {
    if (currentTheme) {
      setBackgroundColor(currentTheme.backgroundColor ?? '')
      setHeaderColor(currentTheme.headerColor ?? '#dbeafe')
      setHeaderFontColor(currentTheme.headerFontColor ?? '')
      setContentFontColor(currentTheme.contentFontColor ?? '')
      setCardColor(currentTheme.cardColor ?? '')
      setAccentColor(currentTheme.accentColor ?? '')
      setFontFamily(currentTheme.fontFamily ?? '')
      setFontSize(currentTheme.fontSize ?? 'base')
    }
  }, [currentTheme])

  // Load the preview font
  useProfileFont(fontFamily || undefined)

  const saveMutation = useMutation({
    mutationFn: (theme: ProfileTheme | null) => updateUserProfile({ profileTheme: theme }),
    onSuccess: () => {
      posthog.capture('profile_theme_updated')
      toast.success('Profile theme saved!')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save theme')
    },
  })

  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)

  const handleSave = () => {
    const theme: ProfileTheme = {}
    if (backgroundColor && isValidHex(backgroundColor)) theme.backgroundColor = backgroundColor
    if (headerColor && headerColor !== '#dbeafe') theme.headerColor = headerColor
    if (headerFontColor && isValidHex(headerFontColor)) theme.headerFontColor = headerFontColor
    if (contentFontColor && isValidHex(contentFontColor)) theme.contentFontColor = contentFontColor
    if (cardColor && isValidHex(cardColor)) theme.cardColor = cardColor
    if (accentColor && isValidHex(accentColor)) theme.accentColor = accentColor
    if (fontFamily) theme.fontFamily = fontFamily
    if (fontSize && fontSize !== 'base') theme.fontSize = fontSize

    saveMutation.mutate(Object.keys(theme).length > 0 ? theme : null)
  }

  const handleReset = () => {
    setBackgroundColor('')
    setHeaderColor('#dbeafe')
    setHeaderFontColor('')
    setContentFontColor('')
    setCardColor('')
    setAccentColor('')
    setFontFamily('')
    setFontSize('base')
    saveMutation.mutate(null)
  }

  // Build preview theme
  const previewTheme: ProfileTheme = {
    backgroundColor: backgroundColor || undefined,
    headerColor,
    headerFontColor: headerFontColor || undefined,
    contentFontColor: contentFontColor || undefined,
    cardColor: cardColor || undefined,
    accentColor: accentColor || undefined,
    fontFamily: fontFamily || undefined,
    fontSize,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Background & Header Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ColorPicker
          label="Background Color"
          value={backgroundColor}
          onChange={setBackgroundColor}
          placeholder="Default"
          hint="Leave empty for default"
        />
        <ColorPicker
          label="Header Color"
          value={headerColor}
          onChange={setHeaderColor}
          placeholder="#dbeafe"
        />
      </div>

      {/* Font Colors & Card Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ColorPicker
          label="Header Font"
          value={headerFontColor}
          onChange={setHeaderFontColor}
          placeholder="Default"
          hint="Name, username, bio text"
        />
        <ColorPicker
          label="Content Font"
          value={contentFontColor}
          onChange={setContentFontColor}
          placeholder="Default"
          hint="Tabs, reviews, lists text"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ColorPicker
          label="Card Color"
          value={cardColor}
          onChange={setCardColor}
          placeholder="Default"
          hint="Review cards, game cards, etc."
        />
        <ColorPicker
          label="Accent Color"
          value={accentColor}
          onChange={setAccentColor}
          placeholder="Default"
          hint="Active tabs, stat boxes"
        />
      </div>

      {/* Font Family & Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-semibold text-foreground">Font Family</Label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="bg-input border-4 border-border rounded-none px-3 py-2 text-sm text-foreground h-10"
          >
            <option value="">Default (System Font)</option>
            {ALLOWED_FONTS.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-semibold text-foreground">Font Size</Label>
          <RadioGroup
            value={fontSize}
            onValueChange={(val) => setFontSize(val as ProfileTheme['fontSize'])}
            className="flex flex-row flex-wrap gap-x-4 gap-y-2 pt-1"
          >
            {FONT_SIZES.map((size) => (
              <div key={size} className="flex items-center gap-1.5">
                <RadioGroupItem value={size} id={`font-size-${size}`} />
                <Label htmlFor={`font-size-${size}`} className="text-sm text-foreground cursor-pointer">
                  {size === 'sm' ? 'Small' : size === 'base' ? 'Normal' : size === 'lg' ? 'Large' : 'XL'}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          Preview
        </Label>
        <div className="border-4 border-border rounded-sm overflow-hidden">
          <div
            className="p-2 profile-themed-content"
            style={getProfileContentStyle(previewTheme)}
          >
            {/* Preview header */}
            <div
              className="border-2 border-border p-3"
              style={getProfileHeaderStyle(previewTheme, "#dbeafe")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center text-xs font-bold">
                  AB
                </div>
                <div>
                  <div className="font-bold text-foreground">Your Display Name</div>
                  <div className="text-sm text-muted-foreground">@username</div>
                </div>
              </div>
            </div>
            {/* Preview accent (tab) */}
            <div className="mt-2 flex border-2 border-border">
              <div className={`flex-1 px-3 py-1.5 text-xs font-bold uppercase text-foreground ${accentColor ? 'profile-accent' : 'bg-amber-200'}`}>
                Tab
              </div>
              <div className="flex-1 px-3 py-1.5 text-xs text-muted-foreground bg-muted border-l-2 border-border">
                Tab
              </div>
            </div>
            {/* Preview tab content with card */}
            <div className="mt-2 bg-card profile-card border-2 border-border p-3">
              <div className="text-sm text-foreground">Sample review or tab content text</div>
              <div className="text-xs text-muted-foreground mt-1">Secondary text preview</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          disabled={saveMutation.isPending}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Default
        </button>
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="border-4 border-border rounded-none bg-card hover:bg-muted font-semibold"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Theme'
          )}
        </Button>
      </div>
    </div>
  )
}
