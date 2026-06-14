import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import ThreeDPanel from "@/pages/ThreeDPanel";
import HistoryPage from "@/pages/HistoryPage";
import AnomalyCenter from "@/pages/AnomalyCenter";
import ExportCenter from "@/pages/ExportCenter";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/3d-panel" element={<ThreeDPanel />} />
          <Route path="/history/:batteryId" element={<HistoryPage />} />
          <Route path="/anomaly" element={<AnomalyCenter />} />
          <Route path="/export" element={<ExportCenter />} />
        </Route>
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}
