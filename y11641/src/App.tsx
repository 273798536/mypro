import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/:levelId" element={<GamePage />} />
      <Route path="/report/:sessionId" element={<ReportPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  );
}
