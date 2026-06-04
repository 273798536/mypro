import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Header } from "@/components/common/Header";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Report from "@/pages/Report";
import Samples from "@/pages/Samples";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </div>
    </Router>
  );
}
