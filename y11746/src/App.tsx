import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ImportPage } from '@/pages/ImportPage';
import { WorkbenchPage } from '@/pages/WorkbenchPage';
import { ExceptionsPage } from '@/pages/ExceptionsPage';
import { ReportPage } from '@/pages/ReportPage';
import { HistoryPage } from '@/pages/HistoryPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/workbench" element={<WorkbenchPage />} />
          <Route path="/exceptions" element={<ExceptionsPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
