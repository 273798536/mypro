import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import FeedbackList from "@/pages/FeedbackList";
import LocationMerge from "@/pages/LocationMerge";
import PlanList from "@/pages/PlanList";
import PlanDetail from "@/pages/PlanDetail";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-municipal-50">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-[1400px] mx-auto px-8 py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/feedbacks" element={<FeedbackList />} />
              <Route path="/locations" element={<LocationMerge />} />
              <Route path="/plans" element={<PlanList />} />
              <Route path="/plans/:id" element={<PlanDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
