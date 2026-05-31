import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import SetupPage from '@/pages/SetupPage';
import PracticePage from '@/pages/PracticePage';
import CorrectionPage from '@/pages/CorrectionPage';
import ReviewPage from '@/pages/ReviewPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/correction" element={<CorrectionPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
