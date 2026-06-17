import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useAppStore } from '@/store/useAppStore'

declare global {
  interface Window {
    __APP_STORE__?: typeof useAppStore;
  }
}

if (typeof window !== 'undefined') {
  window.__APP_STORE__ = useAppStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
