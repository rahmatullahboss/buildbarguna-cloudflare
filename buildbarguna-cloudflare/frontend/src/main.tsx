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
