import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import CaseDetail from "@/pages/CaseDetail";
import ReportExport from "@/pages/ReportExport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<ProjectDetail />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/report/:projectId" element={<ReportExport />} />
      </Routes>
    </Router>
  );
}
