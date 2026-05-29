import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BriefingPage from '@/pages/BriefingPage';
import PlanningPage from '@/pages/PlanningPage';
import FlyingPage from '@/pages/FlyingPage';
import ResultPage from '@/pages/ResultPage';
import { useGameStore } from '@/store/gameStore';
import { useEffect } from 'react';
import { levels } from '@/data/levels';

function AppInitializer() {
  const { selectLevel, currentLevel } = useGameStore();

  useEffect(() => {
    if (!currentLevel) {
      selectLevel(levels[0].id);
    }
  }, []);

  return null;
}

export default function App() {
  return (
    <Router>
      <AppInitializer />
      <Routes>
        <Route path="/" element={<BriefingPage />} />
        <Route path="/plan" element={<PlanningPage />} />
        <Route path="/fly" element={<FlyingPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </Router>
  );
}
