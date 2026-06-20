import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SideNav } from "@/components/layout/SideNav";
import { TopBar } from "@/components/layout/TopBar";
import DashboardPage from "@/pages/DashboardPage";
import FailureQueuePage from "@/pages/FailureQueuePage";
import TimelinePage from "@/pages/TimelinePage";
import ComparePage from "@/pages/ComparePage";
import LateFeaturesPage from "@/pages/LateFeaturesPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex text-primary">
        <SideNav />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar />
          <main className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/failure-queue" element={<FailureQueuePage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/late-features" element={<LateFeaturesPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
