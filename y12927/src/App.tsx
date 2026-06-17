import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import OverviewPage from '@/pages/Overview';
import AnomalyDetailPage from '@/pages/AnomalyDetail';
import CorrectionPage from '@/pages/Correction';
import ExportPage from '@/pages/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/anomaly/:id" element={<AnomalyDetailPage />} />
          <Route path="/correction" element={<CorrectionPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
