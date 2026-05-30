import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LevelLobby from '@/pages/LevelLobby';
import RemixStage from '@/pages/RemixStage';
import ReplayReport from '@/pages/ReplayReport';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelLobby />} />
        <Route path="/level/:id" element={<RemixStage />} />
        <Route path="/report/:id" element={<ReplayReport />} />
      </Routes>
    </Router>
  );
}
