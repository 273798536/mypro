import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import WeighingImport from "@/pages/WeighingImport";
import PeakAnalysis from "@/pages/PeakAnalysis";
import BalanceCalc from "@/pages/BalanceCalc";
import TraceCenter from "@/pages/TraceCenter";
import ReportExport from "@/pages/ReportExport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/weighing" element={<WeighingImport />} />
          <Route path="/analysis/:id" element={<PeakAnalysis />} />
          <Route path="/balance/:id" element={<BalanceCalc />} />
          <Route path="/trace" element={<TraceCenter />} />
          <Route path="/report/:id" element={<ReportExport />} />
        </Route>
      </Routes>
    </Router>
  );
}
