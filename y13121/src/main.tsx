import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useAppStore } from './store/useAppStore'

function InitWrapper() {
  const initFromStorage = useAppStore((s) => s.initFromStorage)

  useEffect(() => {
    initFromStorage()
  }, [initFromStorage])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InitWrapper />
  </StrictMode>,
)
