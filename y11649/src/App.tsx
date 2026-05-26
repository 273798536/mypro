import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StartPage } from '@/pages/StartPage';
import { GamePage } from '@/pages/GamePage';
import { ResultPage } from '@/pages/ResultPage';
import { ReplayPage } from '@/pages/ReplayPage';
import { ReportPage } from '@/pages/ReportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
