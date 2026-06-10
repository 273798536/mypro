import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import WorkflowCenter from "@/pages/WorkflowCenter";
import ReportCenter from "@/pages/ReportCenter";
import ReviewCenter from "@/pages/ReviewCenter";
import TraceView from "@/pages/TraceView";
import Onboarding from "@/pages/Onboarding";
import { getStorage, setStorage } from "@/utils/storage";
import { initMockData } from "@/mock/initMockData";

function AppRouter() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const hasVisited = getStorage("traceability_has_visited");
    if (!hasVisited) {
      setIsFirstVisit(true);
    } else {
      initMockData({ verbose: false });
    }
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600 font-medium">加载中...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={isFirstVisit ? <Navigate to="/onboarding" replace /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workflow" element={<WorkflowCenter />} />
          <Route path="/reports" element={<ReportCenter />} />
          <Route path="/review" element={<ReviewCenter />} />
          <Route path="/review/:id" element={<ReviewCenter />} />
          <Route path="/trace/:sampleId" element={<TraceView />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
