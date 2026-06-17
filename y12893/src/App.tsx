import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Review3D from '@/pages/Review3D';
import TrackCleaning from '@/pages/TrackCleaning';
import Workbench from '@/pages/Workbench';
import Traceability from '@/pages/Traceability';
import TideAnalysis from '@/pages/TideAnalysis';
import Settings from '@/pages/Settings';
import { useDataStore } from '@/store/useDataStore';

function AppContent() {
  const { initDatabase, loadRecords, loadStats, generateMockData } = useDataStore();

  useEffect(() => {
    const init = async () => {
      await initDatabase();
      await loadRecords();
      await loadStats();

      const { records } = useDataStore.getState();
      if (records.length === 0) {
        await generateMockData();
        await loadRecords();
        await loadStats();
      }
    };
    init();
  }, [initDatabase, loadRecords, loadStats, generateMockData]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/review-3d" element={<Review3D />} />
        <Route path="/track-cleaning" element={<TrackCleaning />} />
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/traceability" element={<Traceability />} />
        <Route path="/tide-analysis" element={<TideAnalysis />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
