import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Layout/Navbar";
import { ImportPage } from "@/pages/ImportPage/ImportPage";
import { ParsePage } from "@/pages/ParsePage/ParsePage";
import { AnalysisPage } from "@/pages/AnalysisPage/AnalysisPage";
import { TracePage } from "@/pages/TracePage/TracePage";
import { ReportPage } from "@/pages/ReportPage/ReportPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/parse" element={<ParsePage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/trace" element={<TracePage />} />
          <Route path="/trace/:issueId" element={<TracePage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </div>
    </Router>
  );
}
