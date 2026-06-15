import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import WaterQualityPage from "@/pages/WaterQualityPage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/water-quality" element={<WaterQualityPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
