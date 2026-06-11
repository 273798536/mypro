import { Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import ReconciliationList from '@/pages/ReconciliationList';
import ReconciliationDetail from '@/pages/ReconciliationDetail';
import ImportPage from '@/pages/ImportPage';
import ExportPage from '@/pages/ExportPage';
import { useReconciliationStore } from '@/store/useReconciliationStore';

export default function App() {
  const seedMock = useReconciliationStore((s) => s.seedMockIfEmpty);

  useEffect(() => {
    seedMock();
  }, [seedMock]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ReconciliationList />} />
        <Route path="/reconciliation/:id" element={<ReconciliationDetail />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Route>
    </Routes>
  );
}
