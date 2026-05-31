import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LevelSelect from "@/pages/LevelSelect";
import GameBoard from "@/pages/GameBoard";
import ReviewPage from "@/pages/ReviewPage";
import RuleBook from "@/pages/RuleBook";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/game/:levelId" element={<GameBoard />} />
        <Route path="/review/:sessionId" element={<ReviewPage />} />
        <Route path="/rules" element={<RuleBook />} />
      </Routes>
    </Router>
  );
}
