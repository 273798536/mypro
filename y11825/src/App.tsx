import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import GameLobby from '@/pages/GameLobby';
import GamePage from '@/pages/GamePage';
import SettlementPage from '@/pages/SettlementPage';
import ReplayPage from '@/pages/ReplayPage';
import OptionCardsAdmin from '@/pages/OptionCardsAdmin';
import VolatilityEventsAdmin from '@/pages/VolatilityEventsAdmin';
import CompareResults from '@/pages/CompareResults';
import Layout from '@/components/Layout';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/lobby" element={<Layout><GameLobby /></Layout>} />
        <Route path="/game/:levelId" element={<Layout><GamePage /></Layout>} />
        <Route path="/game/:levelId/settlement" element={<Layout><SettlementPage /></Layout>} />
        <Route path="/game/:levelId/replay" element={<Layout><ReplayPage /></Layout>} />
        <Route path="/admin/option-cards" element={<Layout><OptionCardsAdmin /></Layout>} />
        <Route path="/admin/volatility-events" element={<Layout><VolatilityEventsAdmin /></Layout>} />
        <Route path="/admin/compare-results" element={<Layout><CompareResults /></Layout>} />
      </Routes>
    </Router>
  );
}
