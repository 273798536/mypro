import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LevelSelect } from './pages/LevelSelect';
import { GameScene } from './pages/GameScene';
import { Settlement } from './pages/Settlement';
import { SafetyReport } from './pages/SafetyReport';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/game" element={<GameScene />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/report" element={<SafetyReport />} />
      </Routes>
    </Router>
  );
}

export default App;
