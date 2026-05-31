import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import QueuePage from '@/pages/QueuePage'
import EventsPage from '@/pages/EventsPage'
import EventDetailPage from '@/pages/EventDetailPage'
import ReportPage from '@/pages/ReportPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/queue" replace />} />
        <Route element={<Layout />}>
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/event/:id" element={<EventDetailPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
