import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import RefundList from '@/pages/RefundList';
import RefundDetail from '@/pages/RefundDetail';
import ReservePool from '@/pages/ReservePool';
import History from '@/pages/History';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/refunds" replace />} />
            <Route path="/refunds" element={<RefundList />} />
            <Route path="/refunds/:id" element={<RefundDetail />} />
            <Route path="/reserve" element={<ReservePool />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
