import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SampleDataInit } from "@/components/SampleDataInit";
import { BatchTracking } from "@/pages/BatchTracking";
import { ReagentLedger } from "@/pages/ReagentLedger";
import { ThicknessDetail } from "@/pages/ThicknessDetail";
import { SpectrumInterpretation } from "@/pages/SpectrumInterpretation";
import { CliGuide } from "@/pages/CliGuide";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useState } from "react";

function AppContent() {
  const { initialized, checkInitStatus } = useAppStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkInitStatus().finally(() => setChecking(false));
  }, [checkInitStatus]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!initialized) {
    return <SampleDataInit />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<BatchTracking />} />
        <Route path="/reagents" element={<ReagentLedger />} />
        <Route path="/thickness/:batchId" element={<ThicknessDetail />} />
        <Route path="/spectrum" element={<SpectrumInterpretation />} />
        <Route path="/cli-help" element={<CliGuide />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
