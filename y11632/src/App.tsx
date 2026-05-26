import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StartPage from '@/pages/StartPage';
import LevelSelectPage from '@/pages/LevelSelectPage';
import GamePage from '@/pages/GamePage';
import ResultPage from '@/pages/ResultPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/levels" element={<LevelSelectPage />} />
        <Route path="/play/:levelId" element={<GamePage />} />
        <Route path="/result/:levelId" element={<ResultPage />} />
      </Routes>
    </Router>
  );
}
