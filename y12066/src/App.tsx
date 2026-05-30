import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GamePage from '@/pages/GamePage';
import SettlementPage from '@/pages/SettlementPage';
import ReplayPage from '@/pages/ReplayPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen overflow-hidden">
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/settlement" element={<SettlementPage />} />
          <Route path="/replay" element={<ReplayPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
