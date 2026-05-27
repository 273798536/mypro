import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import PlayPage from '@/pages/PlayPage';
import ResultPage from '@/pages/ResultPage';
import ReportPage from '@/pages/ReportPage';
import HistoryPage from '@/pages/HistoryPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/:levelId" element={<PlayPage />} />
        <Route path="/result/:runId" element={<ResultPage />} />
        <Route path="/report/:runId" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Router>
  );
}
