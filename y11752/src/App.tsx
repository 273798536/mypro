import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { GamePage } from "@/pages/GamePage";
import { ReportPage } from "@/pages/ReportPage";
import { HistoryPage } from "@/pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:caseId" element={<GamePage />} />
        <Route path="/report/:gameId" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Router>
  );
}
