import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { restoreTokenFromSession } from './lib/apiToken'

// Restore JWT from sessionStorage before first render.
// This enables page refresh without losing login state within the same tab.
// If token is expired or corrupted, it is silently cleared.
restoreTokenFromSession()

// Initialize Capacitor plugins for native app
async function initCapacitor() {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const { SplashScreen } = await import('@capacitor/splash-screen')

    // Match status bar color to app header
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#15803d' }) // primary-700 green

    // Hide splash screen after app is ready
    await SplashScreen.hide()
  } catch {
    // Not running in Capacitor (web browser) — ignore silently
  }
}

initCapacitor()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      // Don't retry 401s — user needs to log in, not hammer the server
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
