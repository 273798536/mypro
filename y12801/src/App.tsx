import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import HomePage from '@/pages/HomePage'
import ReviewDetailPage from '@/pages/ReviewDetailPage'
import AnomalyReviewPage from '@/pages/AnomalyReviewPage'
import AuditLogPage from '@/pages/AuditLogPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/review/:batchId" element={<ReviewDetailPage />} />
          <Route path="/anomaly/:batchId" element={<AnomalyReviewPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
