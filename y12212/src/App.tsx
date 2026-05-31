import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ImportCenter from "@/pages/ImportCenter";
import BillReview from "@/pages/BillReview";
import ExceptionCenter from "@/pages/ExceptionCenter";
import ReportExport from "@/pages/ReportExport";
import SystemConfig from "@/pages/SystemConfig";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/import" element={<ImportCenter />} />
          <Route path="/review" element={<BillReview />} />
          <Route path="/exception" element={<ExceptionCenter />} />
          <Route path="/report" element={<ReportExport />} />
          <Route path="/config" element={<SystemConfig />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
