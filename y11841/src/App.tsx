import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LevelSelectPage from "@/pages/LevelSelectPage";
import GamePage from "@/pages/GamePage";
import ResultPage from "@/pages/ResultPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelectPage />} />
        <Route path="/game/:levelId" element={<GamePage />} />
        <Route path="/result/:levelId" element={<ResultPage />} />
      </Routes>
    </Router>
  );
}
