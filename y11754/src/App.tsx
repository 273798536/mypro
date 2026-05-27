import { useState, useEffect } from 'react';
import { StartPage } from './pages/StartPage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { useGameStore } from './store/useGameStore';

type Page = 'start' | 'game' | 'result' | 'history';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('start');
  const { loadGameHistory } = useGameStore();

  useEffect(() => {
    loadGameHistory();
  }, [loadGameHistory]);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {currentPage === 'start' && <StartPage onNavigate={handleNavigate} />}
      {currentPage === 'game' && <GamePage onNavigate={handleNavigate} />}
      {currentPage === 'result' && <ResultPage onNavigate={handleNavigate} />}
      {currentPage === 'history' && <HistoryPage onNavigate={handleNavigate} />}
    </div>
  );
}

export default App;
