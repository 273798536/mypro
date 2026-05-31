import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import AggregationPage from '@/pages/AggregationPage'
import TrackingPage from '@/pages/TrackingPage'
import ReportPage from '@/pages/ReportPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AggregationPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
