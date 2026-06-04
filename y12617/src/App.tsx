import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LevelSelectPage from "@/pages/LevelSelectPage";
import CollisionCanvasPage from "@/pages/CollisionCanvasPage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelectPage />} />
        <Route path="/level/:levelId" element={<CollisionCanvasPage />} />
        <Route path="/report/:levelId" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
