import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import BatchReviewPage from "@/pages/BatchReviewPage";
import RecordsArchivePage from "@/pages/RecordsArchivePage";
import RecordDetailPage from "@/pages/RecordDetailPage";
import AnomalyBoardPage from "@/pages/AnomalyBoardPage";
import ReportExportPage from "@/pages/ReportExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/batches/new" element={<BatchReviewPage />} />
          <Route path="/records" element={<RecordsArchivePage />} />
          <Route path="/records/:id" element={<RecordDetailPage />} />
          <Route path="/anomalies" element={<AnomalyBoardPage />} />
          <Route path="/export" element={<ReportExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
