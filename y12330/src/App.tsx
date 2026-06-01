import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import ImportPage from '@/pages/ImportPage'
import ClusterPage from '@/pages/ClusterPage'
import GraphPage from '@/pages/GraphPage'
import TracePage from '@/pages/TracePage'

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <main className="ml-56 min-h-screen p-6 flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/import" replace />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/cluster" element={<ClusterPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/trace" element={<TracePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
