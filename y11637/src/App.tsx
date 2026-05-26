import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LevelSelect from "@/pages/LevelSelect";
import GameBoard from "@/pages/GameBoard";
import LoadReport from "@/pages/LoadReport";
import { ToastContainer } from "@/components/Toast";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<LevelSelect />} />
          <Route path="/game/:levelId" element={<GameBoard />} />
          <Route path="/report/:sessionId" element={<LoadReport />} />
        </Routes>
        <ToastContainer />
      </div>
    </Router>
  );
}
