import { HashRouter, Routes, Route } from 'react-router-dom';
import ConfigPage from './pages/ConfigPage';
import GamePage from './pages/GamePage';
import SettlementPage from './pages/SettlementPage';
import ReplayPage from './pages/ReplayPage';
import CorrectionPage from './pages/CorrectionPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ConfigPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/correction" element={<CorrectionPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
