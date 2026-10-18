import { QueryClientProvider } from '@tanstack/react-query'
import { Direction } from 'radix-ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/auth/AuthProvider'
import { capturePendingInvitation } from '@/household/pendingInvitation'
import { queryClient } from '@/lib/queryClient'
import { applyTheme, storedTheme } from '@/lib/theme'
import './index.css'
import App from './App.tsx'

// Before the first paint, so a dark theme never flashes light.
applyTheme(storedTheme())

// Before the router renders, so the token leaves the address bar immediately.
capturePendingInvitation()

// Makes the app installable on phones. Only in builds: in development it would get in
// the way of hot reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('Service worker registration failed', error)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Direction.Provider dir="rtl">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster position="top-center" dir="rtl" richColors />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Direction.Provider>
  </StrictMode>,
)
