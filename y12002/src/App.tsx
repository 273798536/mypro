import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Home from "@/pages/Home";
import { LiabilityListPage } from "@/pages/LiabilityList";
import { LiabilityDetailPage } from "@/pages/LiabilityDetail";
import { BadRecordsPage } from "@/pages/BadRecords";
import { ReviewCenterPage } from "@/pages/ReviewCenter";
import { ImportCenterPage } from "@/pages/ImportCenter";
import { ExportCenterPage } from "@/pages/Export";
import { TracePage } from "@/pages/Trace";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/liability" element={<LiabilityListPage />} />
          <Route path="/liability/:id" element={<LiabilityDetailPage />} />
          <Route path="/trace/:id" element={<TracePage />} />
          <Route path="/bad-records" element={<BadRecordsPage />} />
          <Route path="/review" element={<ReviewCenterPage />} />
          <Route path="/import" element={<ImportCenterPage />} />
          <Route path="/export" element={<ExportCenterPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
