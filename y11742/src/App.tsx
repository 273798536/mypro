import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Import from '@/pages/Import';
import Calculator from '@/pages/Calculator';
import Anomalies from '@/pages/Anomalies';
import History from '@/pages/History';
import Export from '@/pages/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<Import />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/history" element={<History />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
