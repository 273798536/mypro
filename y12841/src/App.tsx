import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Workspace from './pages/Workspace'
import Review from './pages/Review'
import Audit from './pages/Audit'
import Compare from './pages/Compare'
import Report from './pages/Report'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Workspace />} />
          <Route path="/review" element={<Review />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/report" element={<Report />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
