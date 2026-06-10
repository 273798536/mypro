import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/Layout";
import HeatmapPage from "@/pages/HeatmapPage";
import CultureRecordPage from "@/pages/CultureRecordPage";
import SampleDetailPage from "@/pages/SampleDetailPage";
import ReviewCenterPage from "@/pages/ReviewCenterPage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HeatmapPage />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
          <Route path="/sample/:id" element={<SampleDetailPage />} />
          <Route path="/culture-record/:id" element={<CultureRecordPage />} />
          <Route path="/review-center" element={<ReviewCenterPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
