import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ScoringPanel from "@/pages/ScoringPanel";
import RankingBoard from "@/pages/RankingBoard";
import AuditTrail from "@/pages/AuditTrail";
import ExportCenter from "@/pages/ExportCenter";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ScoringPanel />} />
          <Route path="/ranking" element={<RankingBoard />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/export" element={<ExportCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}
