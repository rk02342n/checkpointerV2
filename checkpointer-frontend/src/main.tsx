import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { SettingsProvider } from './lib/settingsContext'
import { PostHogProvider } from 'posthog-js/react'
import posthog from 'posthog-js'

// Create a client
const queryClient = new QueryClient()

// Import the generated route tree
import { RouterProvider, createRouter } from '@tanstack/react-router'

// create a new router instance
import { routeTree } from './routeTree.gen'

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: { queryClient }
})

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

posthog.init('phc_HvfVRb2qoLSFdrz2tlKIHLmVfm1JDWQO4Fzq69hPAFz', {
  api_host: 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
  autocapture: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <SettingsProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router}/>
          </QueryClientProvider>
        </ThemeProvider>
      </SettingsProvider>
    </PostHogProvider>
  </StrictMode>,
)


