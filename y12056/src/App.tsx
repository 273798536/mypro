import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LevelSelect from "@/pages/LevelSelect";
import GameBoard from "@/pages/GameBoard";
import ScoreBoard from "@/pages/ScoreBoard";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/game/:levelId" element={<GameBoard />} />
        <Route path="/score/:levelId" element={<ScoreBoard />} />
        <Route path="/report/:attemptId" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
