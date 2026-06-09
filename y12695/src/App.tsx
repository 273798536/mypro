import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import GameScene from "@/pages/GameScene";
import Result from "@/pages/Result";
import ExportCenter from "@/pages/ExportCenter";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/game/:sceneId" element={<GameScene />} />
        <Route path="/result/:sessionId" element={<Result />} />
        <Route path="/export/:sessionId" element={<ExportCenter />} />
      </Routes>
    </Router>
  );
}
