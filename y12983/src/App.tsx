import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import GapList from '@/pages/GapList';
import GapDetail from '@/pages/GapDetail';
import GapFix from '@/pages/GapFix';
import HistoryPage from '@/pages/History';
import AuditPage from '@/pages/Audit';
import TestPathPage from '@/pages/TestPath';
import SnapshotsPage from '@/pages/Snapshots';
import { initializeApp } from '@/utils/init';

export default function App() {
  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/gaps" element={<GapList />} />
          <Route path="/gaps/:id" element={<GapDetail />} />
          <Route path="/gaps/:id/fix" element={<GapFix />} />
          <Route path="/gaps/:id/history" element={<HistoryPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/test" element={<TestPathPage />} />
          <Route path="/snapshots" element={<SnapshotsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
