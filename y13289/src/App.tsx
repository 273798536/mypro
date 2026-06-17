import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ImportPage from './pages/ImportPage';
import CleaningPage from './pages/CleaningPage';
import ListPage from './pages/ListPage';
import HistoryPage from './pages/HistoryPage';
import ExportPage from './pages/ExportPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/import" replace />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="cleaning" element={<CleaningPage />} />
        <Route path="list" element={<ListPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="export" element={<ExportPage />} />
      </Route>
    </Routes>
  );
}
