import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Workbench from './pages/Workbench';
import AnnotationPage from './pages/AnnotationPage';
import DiffAnalysis from './pages/DiffAnalysis';
import SupervisorView from './pages/SupervisorView';
import Reports from './pages/Reports';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Workbench />} />
          <Route path="/annotation/:sampleId" element={<AnnotationPage />} />
          <Route path="/diff-analysis" element={<DiffAnalysis />} />
          <Route path="/supervisor" element={<SupervisorView />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
}
