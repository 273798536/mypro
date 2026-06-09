import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import Workbench from '@/pages/Workbench';
import Review from '@/pages/Review';
import ExportReport from '@/pages/ExportReport';

export default function App() {
  return (
    <Router>
      <div className="no-print">
        <AppHeader />
      </div>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/review" element={<Review />} />
        <Route path="/export" element={<ExportReport />} />
      </Routes>
    </Router>
  );
}
