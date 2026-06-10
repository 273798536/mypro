import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import OverviewPage from '@/pages/OverviewPage'
import CandidateDetailPage from '@/pages/CandidateDetailPage'
import AuditLogPage from '@/pages/AuditLogPage'
import ExportPage from '@/pages/ExportPage'
import GuidePage from '@/pages/GuidePage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/candidate/:id" element={<CandidateDetailPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>
      </Routes>
    </Router>
  )
}
