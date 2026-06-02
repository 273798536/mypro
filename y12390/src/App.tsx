import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useAppStore } from '@/store/useAppStore'
import { routes, getTitleByPath } from '@/router'
import { initializeDB } from '@/db'

function AppContent() {
  const location = useLocation()
  const loadAllData = useAppStore(state => state.loadAllData)
  const title = getTitleByPath(location.pathname)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initializeDB()
      .then(() => loadAllData())
      .then(() => setReady(true))
      .catch((e) => {
        console.error('Init error:', e)
        setReady(true)
      })
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">正在加载音色预设版本库...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-grid">
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
