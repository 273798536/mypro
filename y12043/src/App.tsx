import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import GamePage from "@/pages/GamePage";
import ReviewPage from "@/pages/ReviewPage";
import HistoryPage from "@/pages/HistoryPage";
import ConfigPage from "@/pages/ConfigPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/review/:gameId" element={<ReviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/config" element={<ConfigPage />} />
      </Routes>
    </Router>
  );
}
