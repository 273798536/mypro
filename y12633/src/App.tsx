import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import LevelPage from "@/pages/LevelPage";
import SettlementPage from "@/pages/SettlementPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/level" element={<LevelPage />} />
        <Route path="/settlement" element={<SettlementPage />} />
      </Routes>
    </Router>
  );
}
