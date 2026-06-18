import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Compare from '@/pages/Compare';
import Samples from '@/pages/Samples';
import Versions from '@/pages/Versions';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="compare" element={<Compare />}>
            <Route path=":baseVersion/:targetVersion" element={<Compare />} />
          </Route>
          <Route path="samples/:versionId" element={<Samples />} />
          <Route path="samples" element={<Navigate to="/samples/v5" replace />} />
          <Route path="versions/:versionId" element={<Versions />} />
          <Route path="versions" element={<Navigate to="/versions/v5" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
