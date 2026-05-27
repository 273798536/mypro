import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LevelSelect } from "./components/LevelSelect";
import { GamePage } from "./pages/GamePage";
import { HistoryPage } from "./pages/HistoryPage";
import { HelpPage } from "./pages/HelpPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/game/:levelId" element={<GamePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Router>
  );
}
