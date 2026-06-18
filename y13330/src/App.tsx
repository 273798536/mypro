import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorkbenchPage } from '@/pages/WorkbenchPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ImportPage } from '@/pages/ImportPage';
import { SessionsPage } from '@/pages/SessionsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/workbench" replace />} />
        <Route path="workbench" element={<WorkbenchPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="sessions" element={<SessionsPage />} />
      </Route>
    </Routes>
  );
}
