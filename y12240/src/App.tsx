import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Result from "@/pages/Result";
import Review from "@/pages/Review";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/result" element={<Result />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </Router>
  );
}
