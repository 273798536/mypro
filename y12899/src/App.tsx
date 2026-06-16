import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import ReviewCenter from "@/pages/ReviewCenter";
import ReportPage from "@/pages/ReportPage";
import { Sidebar } from "@/components/Sidebar";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/review" element={<ReviewCenter />} />
            <Route path="/export" element={<ReportPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
