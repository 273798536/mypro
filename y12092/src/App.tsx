import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainWorkspace from "@/pages/MainWorkspace";
import DataMerge from "@/pages/DataMerge";
import ConflictDetail from "@/pages/ConflictDetail";
import ReportPreview from "@/pages/ReportPreview";
import ScreenshotTool from "@/pages/ScreenshotTool";
import Navbar from "@/components/ui/Navbar";

export default function App() {
  return (
    <Router>
      <div className="h-screen w-screen flex flex-col bg-[#0a0e14] overflow-hidden">
        <Navbar />
        <Routes>
          <Route path="/" element={<MainWorkspace />} />
          <Route path="/workspace" element={<Navigate to="/" replace />} />
          <Route path="/merge" element={<DataMerge />} />
          <Route path="/conflict/:id" element={<ConflictDetail />} />
          <Route path="/report" element={<ReportPreview />} />
          <Route path="/screenshot" element={<ScreenshotTool />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
