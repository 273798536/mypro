import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import GamePage from "@/pages/GamePage";
import ReportPage from "@/pages/ReportPage";
import ReviewPage from "@/pages/ReviewPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:sessionId" element={<GamePage />} />
        <Route path="/report/:sessionId" element={<ReportPage />} />
        <Route path="/review/:sessionId" element={<ReviewPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}
