import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { MergeWorkbenchPage } from "@/pages/MergeWorkbenchPage";
import { MergeDetailPage } from "@/pages/MergeDetailPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { ExportCenterPage } from "@/pages/ExportCenterPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/merge" element={<MergeWorkbenchPage />} />
          <Route path="/merge/:groupId" element={<MergeDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/export" element={<ExportCenterPage />} />
        </Route>
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}
