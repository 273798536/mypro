import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { RecordsPage } from '@/pages/RecordsPage';
import { RecordDetailPage } from '@/pages/RecordDetailPage';
import { Scene3DPage } from '@/pages/Scene3DPage';
import { AuditPage } from '@/pages/AuditPage';
import { useAppStore } from '@/store/useAppStore';

function AppInit() {
  const { loadSampleData, isSampleLoaded, batches } = useAppStore();
  useEffect(() => {
    if (!isSampleLoaded || batches.length === 0) {
      loadSampleData();
    }
  }, [loadSampleData, isSampleLoaded, batches.length]);
  return null;
}

export default function App() {
  return (
    <Router>
      <AppInit />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:id" element={<RecordDetailPage />} />
          <Route path="/3d" element={<Scene3DPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
