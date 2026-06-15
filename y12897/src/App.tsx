import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WorkbenchPage } from '@/pages/WorkbenchPage';
import { ReportPage } from '@/pages/ReportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WorkbenchPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
