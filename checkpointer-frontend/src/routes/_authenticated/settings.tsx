import { useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { usePostHog } from 'posthog-js/react'
import { AlertTriangle, Loader2, Moon, Sun, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { dbUserQueryOptions, updateUserProfile } from '@/lib/api'
import { useSettings } from '@/lib/settingsContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Navbar from '@/components/Navbar'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-8 border-4 border-border transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-foreground transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingsPage() {
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { theme, setTheme } = useTheme()
  const { settings } = useSettings()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: dbUserData, isPending: isUserPending } = useQuery({ ...dbUserQueryOptions, retry: false })
  const account = dbUserData?.account

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  // Sync form with fetched account data
  useEffect(() => {
    if (account) {
      setDisplayName(account.displayName ?? '')
      setBio(account.bio ?? '')
      setIsPublic(account.isPublic ?? true)
    }
  }, [account])

  // Save profile mutation
  const profileMutation = useMutation({
    mutationFn: () =>
      updateUserProfile({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
      }),
    onSuccess: () => {
      posthog.capture('profile_updated', { source: 'settings' })
      toast.success('Profile saved!')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save profile')
    },
  })

  // Save privacy mutation
  const privacyMutation = useMutation({
    mutationFn: (value: boolean) => updateUserProfile({ isPublic: value }),
    onSuccess: (_data, value) => {
      posthog.capture('privacy_updated', { is_public: value })
      toast.success(value ? 'Profile is now public' : 'Profile is now private')
      queryClient.invalidateQueries({ queryKey: ['get-db-user'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update privacy setting')
    },
  })

  const handleIsPublicChange = (value: boolean) => {
    setIsPublic(value)
    privacyMutation.mutate(value)
  }

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user', { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete account')
      }
      return res.json()
    },
    onSuccess: () => {
      posthog.capture('account_deleted', { source: 'settings' })
      toast.success('Account deleted')
      window.location.href = '/api/logout'
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete account')
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-8 font-alt">Settings</h1>

        {isUserPending ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* ── Profile Section ── */}
            <section className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] p-6">
              <h2 className="text-lg font-bold text-foreground uppercase tracking-wide mb-4">Profile</h2>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-foreground">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={50}
                    className="bg-input border-4 border-border rounded-none"
                  />
                  <span className="text-xs text-muted-foreground">{displayName.length}/50</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others a bit about yourself..."
                    maxLength={300}
                    rows={3}
                    className="bg-input border-4 border-border rounded-none resize-none text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">{bio.length}/300</span>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    to="/profile"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Edit username & avatar on profile page
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => profileMutation.mutate()}
                    disabled={profileMutation.isPending}
                    className="border-4 border-border rounded-none bg-card hover:bg-muted font-semibold"
                  >
                    {profileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Profile'
                    )}
                  </Button>
                </div>
              </div>
            </section>

            {/* ── Preferences Section ── */}
            <section className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] p-6">
              <h2 className="text-lg font-bold text-foreground uppercase tracking-wide mb-4">Preferences</h2>

              <div className="flex flex-col gap-4">
                {settings.darkModeEnabled && (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Sun className="w-4 h-4 hidden dark:block" />
                        <Moon className="w-4 h-4 dark:hidden" />
                        Dark Mode
                      </span>
                      <span className="text-xs text-muted-foreground">Switch between light and dark theme</span>
                    </div>
                    <ToggleSwitch
                      checked={theme === 'dark'}
                      onChange={(val) => {
                        const newTheme = val ? 'dark' : 'light'
                        posthog.capture('dark_mode_toggled', { new_theme: newTheme, source: 'settings' })
                        setTheme(newTheme)
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Public Profile</span>
                    <span className="text-xs text-muted-foreground">
                      {isPublic
                        ? 'Your profile is visible to everyone'
                        : 'Your profile is only visible to you'}
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={isPublic}
                    onChange={handleIsPublicChange}
                  />
                </div>
              </div>
            </section>

            {/* ── Account Section ── */}
            <section className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] p-6">
              <h2 className="text-lg font-bold text-foreground uppercase tracking-wide mb-4">Account</h2>

              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data, including your reviews and game history. This cannot be undone.
                </p>
                <div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="border-4 border-border rounded-none font-semibold"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </section>

          </div>
        )}
      </main>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-background border-4 border-border shadow-[6px_6px_0px_0px_rgba(41,37,36,1)] dark:shadow-[6px_6px_0px_0px_rgba(120,113,108,0.5)] rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete your account and remove all your data including your reviews.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteAccountMutation.isPending}
              className="rounded-none border-4 border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="rounded-none border-4 border-border"
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
