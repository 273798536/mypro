import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { Home } from './pages/Home';
import { Game } from './pages/Game';
import { Result } from './pages/Result';
import { History } from './pages/History';
import { Replay } from './pages/Replay';

export default function App() {
  const { currentPage, loadFromStorage } = useGameStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'game':
        return <Game />;
      case 'result':
        return <Result />;
      case 'history':
        return <History />;
      case 'replay':
        return <Replay />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderPage()}
    </div>
  );
}
