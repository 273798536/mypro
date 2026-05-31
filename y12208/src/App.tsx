import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import TrialCalculation from "@/pages/TrialCalculation";
import ClaimDeduplication from "@/pages/ClaimDeduplication";
import RuleVersions from "@/pages/RuleVersions";
import RollingReport from "@/pages/RollingReport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trial-calculation" element={<TrialCalculation />} />
          <Route path="/claim-deduplication" element={<ClaimDeduplication />} />
          <Route path="/rule-versions" element={<RuleVersions />} />
          <Route path="/rolling-report" element={<RollingReport />} />
        </Route>
      </Routes>
    </Router>
  );
}
