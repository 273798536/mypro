import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Batches from '@/pages/Batches';
import BatchDetail from '@/pages/BatchDetail';
import History from '@/pages/History';
import Anomalies from '@/pages/Anomalies';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/batches" replace />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/batches/:id" element={<BatchDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="*" element={<Navigate to="/batches" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
