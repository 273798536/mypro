
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReplayPage } from './pages/ReplayPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/result/:sessionId" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/replay/:sessionId" element={<ReplayPage />} />
      </Routes>
    </Router>
  );
}

export default App;

