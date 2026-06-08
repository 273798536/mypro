import { Routes, Route, Navigate } from 'react-router-dom';
import SectionPage from '@/pages/SectionPage';
import RenderPage from '@/pages/RenderPage';
import RecordsPage from '@/pages/RecordsPage';
import TestPage from '@/pages/TestPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/section" replace />} />
      <Route path="/section" element={<SectionPage />} />
      <Route path="/render" element={<RenderPage />} />
      <Route path="/records" element={<RecordsPage />} />
      <Route path="/test" element={<TestPage />} />
    </Routes>
  );
}
