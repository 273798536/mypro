import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import QueueDetail from "@/pages/QueueDetail";
import Simulation from "@/pages/Simulation";
import Distribution from "@/pages/Distribution";
import Comparison from "@/pages/Comparison";
import Exceptions from "@/pages/Exceptions";

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/queue-detail" element={<QueueDetail />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/distribution" element={<Distribution />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
