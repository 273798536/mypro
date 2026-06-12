import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import EventTracker from '@/pages/EventTracker';
import RiskMatrix from '@/pages/RiskMatrix';
import TideReportPage from '@/pages/TideReportPage';
import DataCleaner from '@/pages/DataCleaner';
import Delivery from '@/pages/Delivery';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<EventTracker />} />
          <Route path="events/:buoyId" element={<EventTracker />} />
          <Route path="risk-matrix" element={<RiskMatrix />} />
          <Route path="tide-report" element={<TideReportPage />} />
          <Route path="data-cleaner" element={<DataCleaner />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
