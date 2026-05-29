import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Game from "@/pages/Game";
import Result from "@/pages/Result";
import Replay from "@/pages/Replay";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/result" element={<Result />} />
        <Route path="/replay" element={<Replay />} />
      </Routes>
    </Router>
  );
}
