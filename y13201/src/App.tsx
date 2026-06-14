import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Toasts from '@/components/Toasts'
import Dashboard from '@/pages/Dashboard'
import TracksPage from '@/pages/TracksPage'
import NotesIndexPage from '@/pages/NotesIndexPage'
import ExportPage from '@/pages/ExportPage'

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 px-8 py-6 overflow-x-hidden">
          <div className="w-full max-w-[1440px] mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tracks" element={<TracksPage />} />
              <Route path="/notes" element={<NotesIndexPage />} />
              <Route path="/notes/:id" element={<NotesIndexPage />} />
              <Route path="/export" element={<ExportPage />} />
            </Routes>
          </div>
        </main>
        <Toasts />
      </div>
    </Router>
  )
}
