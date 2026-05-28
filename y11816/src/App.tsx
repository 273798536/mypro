import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import DataImport from "@/pages/DataImport";
import ProcessPage from "@/pages/ProcessPage";
import ReviewPage from "@/pages/ReviewPage";
import SettlementPage from "@/pages/SettlementPage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/process" element={<ProcessPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/settlement" element={<SettlementPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
