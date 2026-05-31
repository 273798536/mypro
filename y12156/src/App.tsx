import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import DataInput from "@/pages/DataInput";
import ConflictDetection from "@/pages/ConflictDetection";
import DataValidation from "@/pages/DataValidation";
import CalculationCenter from "@/pages/CalculationCenter";
import ReportExport from "@/pages/ReportExport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        } />
        <Route path="/data-input" element={
          <AppLayout>
            <DataInput />
          </AppLayout>
        } />
        <Route path="/conflicts" element={
          <AppLayout>
            <ConflictDetection />
          </AppLayout>
        } />
        <Route path="/validation" element={
          <AppLayout>
            <DataValidation />
          </AppLayout>
        } />
        <Route path="/calculation" element={
          <AppLayout>
            <CalculationCenter />
          </AppLayout>
        } />
        <Route path="/reports" element={
          <AppLayout>
            <ReportExport />
          </AppLayout>
        } />
      </Routes>
    </Router>
  );
}
