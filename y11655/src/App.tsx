import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainMenu } from './components/menu/MainMenu';
import { GameScreen } from './components/game/GameScreen';
import { ResultScreen } from './components/result/ResultScreen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/result" element={<ResultScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
