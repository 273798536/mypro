import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Structure from './pages/Structure';
import Contamination from './pages/Contamination';
import Lineage from './pages/Lineage';
import Anomalies from './pages/Anomalies';
import Report from './pages/Report';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/structure" element={<Structure />} />
          <Route path="/contamination" element={<Contamination />} />
          <Route path="/lineage" element={<Lineage />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/report" element={<Report />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
