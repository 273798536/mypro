import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { GamePage } from '@/pages/GamePage';
import { ResultPage } from '@/pages/ResultPage';
import { ReportPage } from '@/pages/ReportPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:levelId" element={<GamePage />} />
        <Route path="/result/:gameId" element={<ResultPage />} />
        <Route path="/report/:gameId" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
