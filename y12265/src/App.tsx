import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import History from "@/pages/History";
import Replay from "@/pages/Replay";
import Config from "@/pages/Config";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/history" element={<History />} />
        <Route path="/replay/:id" element={<Replay />} />
        <Route path="/config" element={<Config />} />
      </Routes>
    </Router>
  );
}
