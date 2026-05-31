import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import ContainerDetail from '@/pages/ContainerDetail';
import Rules from '@/pages/Rules';
import Audit from '@/pages/Audit';
import ExportPage from '@/pages/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/container/:id" element={<ContainerDetail />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
