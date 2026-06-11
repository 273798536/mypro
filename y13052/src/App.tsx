import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout.js';
import CaseListPage from '@/pages/CaseListPage.js';
import CaseDetailPage from '@/pages/CaseDetailPage.js';
import HistoryPage from '@/pages/HistoryPage.js';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/cases" replace />} />
          <Route path="cases" element={<CaseListPage />} />
          <Route path="cases/:id" element={<CaseDetailPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/cases" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
