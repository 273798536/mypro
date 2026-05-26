import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GameProvider } from "./store/gameContext";
import { StartPage } from "./pages/StartPage";
import { GamePage } from "./pages/GamePage";
import { ResultPage } from "./pages/ResultPage";
import { ReplayPage } from "./pages/ReplayPage";

export default function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/game/:levelId" element={<GamePage />} />
          <Route path="/result/:levelId" element={<ResultPage />} />
          <Route path="/replay/:replayId" element={<ReplayPage />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}
