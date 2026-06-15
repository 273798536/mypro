import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import AlignmentOverview from '@/pages/AlignmentOverview'
import ScreenshotEntry from '@/pages/ScreenshotEntry'

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-16 lg:ml-56 p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<AlignmentOverview />} />
            <Route path="/screenshot/new" element={<ScreenshotEntry />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
