import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import AmortizationList from "@/pages/AmortizationList";
import AmortizationDetail from "@/pages/AmortizationDetail";
import AmortizationEdit from "@/pages/AmortizationEdit";
import History from "@/pages/History";
import DataImport from "@/pages/DataImport";
import ExportReport from "@/pages/ExportReport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/amortization" element={<AmortizationList />} />
        <Route path="/amortization/:id" element={<AmortizationDetail />} />
        <Route path="/amortization/:id/edit" element={<AmortizationEdit />} />
        <Route path="/history" element={<History />} />
        <Route path="/import" element={<DataImport />} />
        <Route path="/export" element={<ExportReport />} />
      </Routes>
    </Router>
  );
}
