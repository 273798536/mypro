import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import GamePage from "@/pages/GamePage";
import ResultPage from "@/pages/ResultPage";
import ReviewPage from "@/pages/ReviewPage";
import HistoryPage from "@/pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:mapId" element={<GamePage />} />
        <Route path="/result/:gameId" element={<ResultPage />} />
        <Route path="/review/:gameId" element={<ReviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}
