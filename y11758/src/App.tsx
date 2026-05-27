import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StartPage } from '@/pages/StartPage';
import { GamePage } from '@/pages/GamePage';
import { ResultPage } from '@/pages/ResultPage';
import { ReplayPage } from '@/pages/ReplayPage';
import { HistoryPage } from '@/pages/HistoryPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/game/:levelId" element={<GamePage />} />
        <Route path="/result/:gameId" element={<ResultPage />} />
        <Route path="/replay/:gameId" element={<ReplayPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
