import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { DataImport } from "./pages/DataImport";
import { ScheduleCheck } from "./pages/ScheduleCheck";
import { ChangeCompare } from "./pages/ChangeCompare";
import { BoundarySamples } from "./pages/BoundarySamples";
import { ManualCorrection } from "./pages/ManualCorrection";
import { DispatchHistory } from "./pages/DispatchHistory";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-navy-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/check" element={<ScheduleCheck />} />
          <Route path="/compare" element={<ChangeCompare />} />
          <Route path="/boundary" element={<BoundarySamples />} />
          <Route path="/correction" element={<ManualCorrection />} />
          <Route path="/history" element={<DispatchHistory />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
