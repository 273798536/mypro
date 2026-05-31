import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Replay from "@/pages/Replay";
import HistoryPage from "@/pages/History";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:levelId" element={<Game />} />
        <Route path="/replay/:sessionId" element={<Replay />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Router>
  );
}
