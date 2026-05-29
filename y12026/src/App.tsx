import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ImportPage } from '@/pages/ImportPage';
import { LicensePlatePage } from '@/pages/LicensePlatePage';
import { RenewalPage } from '@/pages/RenewalPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { ExportPage } from '@/pages/ExportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/license-plates" element={<LicensePlatePage />} />
            <Route path="/renewal" element={<RenewalPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
