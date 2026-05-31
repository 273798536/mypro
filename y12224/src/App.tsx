import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import DepositPage from '@/pages/DepositPage';
import ArchivePage from '@/pages/ArchivePage';
import SettlementPage from '@/pages/SettlementPage';
import BedsPage from '@/pages/BedsPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/deposit" replace />} />
        <Route element={<Layout />}>
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/settlement" element={<SettlementPage />} />
          <Route path="/beds" element={<BedsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
