import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ImportPage from "@/pages/ImportPage";
import DashboardPage from "@/pages/DashboardPage";
import CorrectionPage from "@/pages/CorrectionPage";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-[#f8f9fa]">
        <Sidebar />
        <main className="flex-1 ml-[240px] p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/import" replace />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/correction" element={<CorrectionPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
