import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import Channel3DPage from '@/pages/Channel3DPage';
import TrajectoryCleanPage from '@/pages/TrajectoryCleanPage';
import TideImpactPage from '@/pages/TideImpactPage';
import AnomalyWorkbenchPage from '@/pages/AnomalyWorkbenchPage';
import ReportExportPage from '@/pages/ReportExportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/visualization" replace />} />
          <Route path="visualization" element={<Channel3DPage />} />
          <Route path="trajectory" element={<TrajectoryCleanPage />} />
          <Route path="tide" element={<TideImpactPage />} />
          <Route path="anomaly" element={<AnomalyWorkbenchPage />} />
          <Route path="report" element={<ReportExportPage />} />
          <Route path="*" element={<Navigate to="/visualization" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
