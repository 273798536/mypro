import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import HomePage from './pages/HomePage';
import SnapshotPage from './pages/SnapshotPage';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/snapshot/:id" element={<SnapshotPage />} />
          <Route path="/snapshot/:id/history" element={<HistoryPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
