import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TopNav from "@/components/TopNav";
import HomePage from "@/pages/HomePage";
import MaterialsPage from "@/pages/MaterialsPage";
import SetupPage from "@/pages/SetupPage";
import ScenePage from "@/pages/ScenePage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0b1020] text-slate-100">
        <TopNav />
        <main className="pb-10">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/scene/:taskId" element={<ScenePage />} />
            <Route path="/report/:taskId" element={<ReportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
