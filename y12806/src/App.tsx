import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import LotDetail from '@/pages/LotDetail';
import SideBySide from '@/pages/SideBySide';
import ReviewStation from '@/pages/ReviewStation';
import ExportCenter from '@/pages/ExportCenter';
import DemoMode from '@/pages/DemoMode';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="lot/:lotId" element={<LotDetail />} />
          <Route path="compare/:oldLotId/:newLotId" element={<SideBySide />} />
          <Route path="review" element={<ReviewStation />} />
          <Route path="export" element={<ExportCenter />} />
          <Route path="demo" element={<DemoMode />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
