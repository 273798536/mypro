import { Routes, Route, Navigate } from 'react-router-dom';
import QueueBoard from '@/pages/QueueBoard';
import DetailPage from '@/pages/DetailPage';
import ReviewPage from '@/pages/ReviewPage';
import HistoryPage from '@/pages/HistoryPage';
import Layout from '@/components/Layout';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<QueueBoard />} />
        <Route path="/detail/:id" element={<DetailPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
