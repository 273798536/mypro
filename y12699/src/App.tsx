import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import SlicePage from '@/pages/SlicePage';
import OutlierPage from '@/pages/OutlierPage';
import CollisionPage from '@/pages/CollisionPage';
import AnomalyPage from '@/pages/AnomalyPage';
import ExportPage from '@/pages/ExportPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="slice" element={<SlicePage />} />
        <Route path="outlier" element={<OutlierPage />} />
        <Route path="collision" element={<CollisionPage />} />
        <Route path="anomaly" element={<AnomalyPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
