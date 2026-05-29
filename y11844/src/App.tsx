import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import GamePage from "@/pages/GamePage";
import CarbonLedgerPage from "@/pages/CarbonLedgerPage";
import DataMergePage from "@/pages/DataMergePage";
import ReportPage from "@/pages/ReportPage";
import AnomalyDemoPage from "@/pages/AnomalyDemoPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/ledger" element={<CarbonLedgerPage />} />
        <Route path="/data-merge" element={<DataMergePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/anomaly-demo" element={<AnomalyDemoPage />} />
      </Routes>
    </Router>
  );
}
