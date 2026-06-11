import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import CalendarHome from "@/pages/CalendarHome";
import InspectionDetail from "@/pages/InspectionDetail";
import DriftCalculator from "@/pages/DriftCalculator";
import TrajectoryCleaning from "@/pages/TrajectoryCleaning";
import WaterQualityAlert from "@/pages/WaterQualityAlert";
import AuditTrailCenter from "@/pages/AuditTrailCenter";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<CalendarHome />} />
          <Route path="/inspection/:id" element={<InspectionDetail />} />
          <Route path="/drift-calculator" element={<DriftCalculator />} />
          <Route path="/trajectory-cleaning" element={<TrajectoryCleaning />} />
          <Route path="/water-quality" element={<WaterQualityAlert />} />
          <Route path="/audit-trail" element={<AuditTrailCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}
