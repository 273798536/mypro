import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Annotations from '@/pages/Annotations';
import Parts from '@/pages/Parts';
import Trace from '@/pages/Trace';
import Export from '@/pages/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="annotations" element={<Annotations />} />
          <Route path="parts" element={<Parts />} />
          <Route path="trace" element={<Trace />} />
          <Route path="export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
