import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WorkbenchPage from '@/pages/WorkbenchPage';
import AnomaliesPage from '@/pages/AnomaliesPage';
import ExportPage from '@/pages/ExportPage';
import ConsolePage from '@/pages/ConsolePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WorkbenchPage />} />
        <Route path="/anomalies" element={<AnomaliesPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/console" element={<ConsolePage />} />
        <Route path="*" element={<WorkbenchPage />} />
      </Routes>
    </Router>
  );
}
