import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initMockData } from './data/mockData'
import { initDB } from './db'

function AppInitializer() {
  useEffect(() => {
    const init = async () => {
      await initDB()
      await initMockData()
    }
    init()
  }, [])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppInitializer />
  </StrictMode>,
)
