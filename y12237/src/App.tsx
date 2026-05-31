import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GamePage } from "@/pages/GamePage";
import { BattleReportPage } from "@/pages/BattleReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/battle-report" element={<BattleReportPage />} />
      </Routes>
    </Router>
  );
}
