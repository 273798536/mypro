import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import QualityControl from '@/pages/QualityControl';
import SampleImport from '@/pages/SampleImport';
import Calculator from '@/pages/Calculator';
import ReviewCenter from '@/pages/ReviewCenter';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<QualityControl />} />
          <Route path="/import" element={<SampleImport />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/review" element={<ReviewCenter />} />
        </Routes>
      </Layout>
    </Router>
  );
}
