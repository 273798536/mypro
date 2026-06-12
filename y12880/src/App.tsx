import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import MapPage from '@/pages/MapPage';
import ConflictsPage from '@/pages/ConflictsPage';
import RisksPage from '@/pages/RisksPage';
import ReportsPage from '@/pages/ReportsPage';
import DataPage from '@/pages/DataPage';
import { useAppStore } from '@/store/appStore';

function App() {
  const loadInitialData = useAppStore(state => state.loadInitialData);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="conflicts" element={<ConflictsPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
