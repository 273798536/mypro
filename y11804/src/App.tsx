import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { CalendarPage } from '@/pages/CalendarPage';
import { ImportPage } from '@/pages/ImportPage';
import { VerifyPage } from '@/pages/VerifyPage';
import { ExportPage } from '@/pages/ExportPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </div>
    </Router>
  );
}
