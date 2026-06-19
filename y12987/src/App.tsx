import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import TopologyPage from '@/pages/TopologyPage'
import WorkordersPage from '@/pages/WorkordersPage'
import WorkorderDetailPage from '@/pages/WorkorderDetailPage'
import AuditPage from '@/pages/AuditPage'
import GuidePage from '@/pages/GuidePage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TopologyPage />} />
          <Route path="/workorders" element={<WorkordersPage />} />
          <Route path="/workorders/:id" element={<WorkorderDetailPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>
      </Routes>
    </Router>
  )
}
