import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import HomePage from "@/pages/HomePage";
import BackupsPage from "@/pages/BackupsPage";
import BackupDetailPage from "@/pages/BackupDetailPage";
import HistoryPage from "@/pages/HistoryPage";
import SchemaComparePage from "@/pages/SchemaComparePage";
import TestSuitePage from "@/pages/TestSuitePage";
import ReportsPage from "@/pages/ReportsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/backups" element={<BackupsPage />} />
          <Route path="/backups/:id" element={<BackupDetailPage />} />
          <Route path="/backups/:id/history" element={<HistoryPage />} />
          <Route path="/schema-compare" element={<SchemaComparePage />} />
          <Route path="/test-suite" element={<TestSuitePage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
