import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import UploadPage from '@/pages/UploadPage';
import AnalysisPage from '@/pages/AnalysisPage';
import ExportPage from '@/pages/ExportPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
