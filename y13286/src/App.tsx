import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import OverviewPage from "@/pages/OverviewPage";
import DetailPage from "@/pages/DetailPage";
import AnalysisPage from "@/pages/AnalysisPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/point/:id" element={<DetailPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="*" element={<OverviewPage />} />
      </Routes>
    </Router>
  );
}
