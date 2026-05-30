import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Lobby } from "@/pages/Lobby";
import { Game } from "@/pages/Game";
import { Settlement } from "@/pages/Settlement";
import { Review } from "@/pages/Review";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game" element={<Game />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </Router>
  );
}
