import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import WorkbenchPage from "@/pages/WorkbenchPage";
import HistoryPage from "@/pages/HistoryPage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workbench/:taskId" element={<WorkbenchPage />} />
        <Route path="/workbench/:taskId/history" element={<HistoryPage />} />
        <Route path="/workbench/:taskId/export" element={<ExportPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
