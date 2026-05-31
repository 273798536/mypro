import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Settlement from "@/pages/Settlement";
import Review from "@/pages/Review";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </Router>
  );
}
