import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnalysisPage } from "./pages/AnalysisPage";
import { ReportPage } from "./components/report/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnalysisPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<AnalysisPage />} />
      </Routes>
    </Router>
  );
}
