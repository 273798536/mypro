import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/pages/Dashboard";
import { NozzleManagement } from "@/pages/NozzleManagement";
import { PressureRecords } from "@/pages/PressureRecords";
import { Calculation } from "@/pages/Calculation";
import { Results } from "@/pages/Results";
import { ResultDetail } from "@/pages/ResultDetail";
import { Reports } from "@/pages/Reports";
import { initializeMockData } from "@/data/mockData";
import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    initializeMockData();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="nozzles" element={<NozzleManagement />} />
          <Route path="pressure" element={<PressureRecords />} />
          <Route path="calculation" element={<Calculation />} />
          <Route path="results" element={<Results />} />
          <Route path="results/:id" element={<ResultDetail />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
