import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import SampleDetail from '@/pages/SampleDetail';
import Review from '@/pages/Review';
import Report from '@/pages/Report';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sample/:id" element={<SampleDetail />} />
          <Route path="/review" element={<Review />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}
