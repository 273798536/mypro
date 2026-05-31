import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WorkbenchPage } from "@/pages/WorkbenchPage";
import { VersionsPage } from "@/pages/VersionsPage";
import { ReportPage } from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WorkbenchPage />} />
        <Route path="/versions" element={<VersionsPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
