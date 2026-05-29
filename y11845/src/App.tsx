import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import CasePage from '@/pages/CasePage';
import ReportPage from '@/pages/ReportPage';
import ReviewPage from '@/pages/ReviewPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/case/:caseId" element={<CasePage />} />
        <Route path="/case/:caseId/report" element={<ReportPage />} />
        <Route path="/case/:caseId/review" element={<ReviewPage />} />
      </Routes>
    </Router>
  );
}
