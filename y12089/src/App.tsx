import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Analysis } from "@/pages/Analysis";
import { DemoMode } from "@/pages/DemoMode";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analysis/:id" element={<Analysis />} />
        <Route path="/demo/:id" element={<DemoMode />} />
      </Routes>
    </Router>
  );
}
