import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { installGlobalErrorLogging } from '@/lib/logger'
import { USE_MOCK } from '@/lib/constants'
import { queryClient } from '@/lib/queryClient'
import App from './App'
import './index.css'

installGlobalErrorLogging()

if (USE_MOCK) {
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
