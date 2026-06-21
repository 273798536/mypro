import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import SampleDetailPage from "@/pages/SampleDetailPage";
import TimelinePage from "@/pages/TimelinePage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sample/:id" element={<SampleDetailPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen grid place-items-center bg-ink-950 p-8">
              <div className="text-center">
                <div className="text-5xl font-black text-signal-cyan/80">404</div>
                <div className="mt-2 text-sm text-ink-500">页面不存在</div>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
