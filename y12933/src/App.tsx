import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { ToastContainer } from '@/components/ToastContainer'
import Overview from '@/pages/Overview'
import Replay from '@/pages/Replay'
import Versions from '@/pages/Versions'

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-ink-950 text-zinc-200">
        <Sidebar />
        <main className="relative min-w-0 flex-1">
          <div className="bg-grid pointer-events-none fixed inset-0 opacity-[0.04]" />
          <div className="bg-radial-spot pointer-events-none fixed inset-0" />
          <div className="relative z-10">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/replay" element={<Replay />} />
              <Route path="/versions" element={<Versions />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <ToastContainer />
      </div>
    </Router>
  )
}
