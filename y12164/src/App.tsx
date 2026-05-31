import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainPage } from "@/pages/MainPage";
import { MergePage } from "@/pages/MergePage";
import { ReportPage } from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
