import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import PointListPage from '@/pages/PointListPage';
import PointDetailPage from '@/pages/PointDetailPage';
import MergePage from '@/pages/MergePage';
import ImportPage from '@/pages/ImportPage';

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/points" element={<PointListPage />} />
          <Route path="/points/:id" element={<PointDetailPage />} />
          <Route path="/merge" element={<MergePage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
