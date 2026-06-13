import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import ReplayPage from '@/pages/ReplayPage'
import TracePage from '@/pages/TracePage'
import RecalcPage from '@/pages/RecalcPage'
import QueuePage from '@/pages/QueuePage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ReplayPage />} />
          <Route path="/trace" element={<TracePage />} />
          <Route path="/recalc" element={<RecalcPage />} />
          <Route path="/queue" element={<QueuePage />} />
        </Route>
      </Routes>
    </Router>
  )
}
