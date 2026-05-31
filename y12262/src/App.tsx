import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Review from "@/pages/Review";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:levelId" element={<Game />} />
        <Route path="/review/:levelId" element={<Review />} />
        <Route path="/report/:levelId" element={<Report />} />
      </Routes>
    </Router>
  );
}
