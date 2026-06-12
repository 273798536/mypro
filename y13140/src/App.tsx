import { Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import HistoryPage from '@/pages/HistoryPage';
import AnalysisPage from '@/pages/AnalysisPage';
import AnomalyPage from '@/pages/AnomalyPage';
import ReviewPage from '@/pages/ReviewPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="history/:paramId" element={<HistoryPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="anomaly" element={<AnomalyPage />} />
        <Route path="review" element={<ReviewPage />} />
      </Route>
    </Routes>
  );
}
