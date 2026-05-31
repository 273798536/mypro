import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Review from "@/pages/Review";
import Leaderboard from "@/pages/Leaderboard";
import Import from "@/pages/Import";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:levelId" element={<Game />} />
        <Route path="/review/:gameId" element={<Review />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </Router>
  );
}
