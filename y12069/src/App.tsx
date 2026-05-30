import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GamePage } from '@/components/pages/GamePage';
import { ReplayPage } from '@/components/pages/ReplayPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/replay" element={<ReplayPage />} />
      </Routes>
    </Router>
  );
}

export default App;
