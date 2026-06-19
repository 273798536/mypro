import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import DriftList from '@/pages/DriftList'
import DriftDetail from '@/pages/DriftDetail'
import DriftCorrect from '@/pages/DriftCorrect'
import AuditPage from '@/pages/AuditPage'
import SlowQueryPage from '@/pages/SlowQueryPage'
import RollbackPage from '@/pages/RollbackPage'
import SnapshotPage from '@/pages/SnapshotPage'
import HistoryPage from '@/pages/HistoryPage'
import TestsPage from '@/pages/TestsPage'
import DownloadPage from '@/pages/DownloadPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/drift" element={<DriftList />} />
          <Route path="/drift/:id" element={<DriftDetail />} />
          <Route path="/drift/:id/correct" element={<DriftCorrect />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/slow-query" element={<SlowQueryPage />} />
          <Route path="/rollback" element={<RollbackPage />} />
          <Route path="/snapshot" element={<SnapshotPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route
            path="*"
            element={
              <div className="text-center py-20">
                <div className="font-serif italic text-3xl mb-2">404</div>
                <div className="text-txt-muted">页面不存在</div>
              </div>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}
