import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Dashboard from "@/pages/Dashboard";
import Timeline from "@/pages/Timeline";
import Reports from "@/pages/Reports";
import ParameterDetail from "@/pages/ParameterDetail";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-parchment-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/parameter/:id" element={<ParameterDetail />} />
        </Routes>
      </div>
    </Router>
  );
}
