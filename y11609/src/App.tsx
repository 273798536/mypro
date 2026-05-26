import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ClaimList from '@/pages/ClaimList';
import ClaimDetail from '@/pages/ClaimDetail';
import ClaimEdit from '@/pages/ClaimEdit';
import ClaimHistory from '@/pages/ClaimHistory';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/claims" replace />} />
          <Route path="/claims" element={<ClaimList />} />
          <Route path="/claims/:id" element={<ClaimDetail />} />
          <Route path="/claims/:id/edit" element={<ClaimEdit />} />
          <Route path="/claims/:id/history" element={<ClaimHistory />} />
          <Route path="*" element={<Navigate to="/claims" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
