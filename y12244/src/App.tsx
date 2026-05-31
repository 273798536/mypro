import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartPage from "@/pages/StartPage";
import GamePage from "@/pages/GamePage";
import SettlementPage from "@/pages/SettlementPage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
