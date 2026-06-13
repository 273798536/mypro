import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import ReplayPage from '@/pages/ReplayPage'
import AnomaliesPage from '@/pages/AnomaliesPage'

export default function App() {
  return (
    <Router>
      <div className="h-screen bg-[#0f172a]">
        <Navigation />
        <Routes>
          <Route path="/" element={<ReplayPage />} />
          <Route path="/anomalies" element={<AnomaliesPage />} />
        </Routes>
      </div>
    </Router>
  )
}
