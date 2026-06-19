import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import MigrationStatus from '@/pages/MigrationStatus'
import SlowQueryLogs from '@/pages/SlowQueryLogs'
import MigrationScripts from '@/pages/MigrationScripts'
import ConflictAnalysis from '@/pages/ConflictAnalysis'
import BackupGaps from '@/pages/BackupGaps'
import SnapshotConclusion from '@/pages/SnapshotConclusion'
import IndexSuggestions from '@/pages/IndexSuggestions'
import AuditView from '@/pages/AuditView'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/migration-status" replace />} />
          <Route path="migration-status" element={<MigrationStatus />} />
          <Route path="slow-query-logs" element={<SlowQueryLogs />} />
          <Route path="migration-scripts" element={<MigrationScripts />} />
          <Route path="conflict-analysis/:id" element={<ConflictAnalysis />} />
          <Route path="backup-gaps" element={<BackupGaps />} />
          <Route path="snapshot-conclusion" element={<SnapshotConclusion />} />
          <Route path="index-suggestions" element={<IndexSuggestions />} />
          <Route path="audit-view" element={<AuditView />} />
        </Route>
      </Routes>
    </Router>
  )
}
