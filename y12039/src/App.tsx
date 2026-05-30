import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { ReplayPage } from './pages/ReplayPage';
import { useGameStore } from './store/useGameStore';

function App() {
  const initGame = useGameStore(state => state.initGame);

  React.useEffect(() => {
    initGame(false);
  }, [initGame]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/replay" element={<ReplayPage />} />
      </Routes>
    </Router>
  );
}

export default App;
