import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GameBoard from "@/pages/GameBoard";
import ReviewPanel from "@/pages/ReviewPanel";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameBoard />} />
        <Route path="/review" element={<ReviewPanel />} />
      </Routes>
    </Router>
  );
}
