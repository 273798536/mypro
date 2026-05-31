import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Donations from "@/pages/Donations";
import Budgets from "@/pages/Budgets";
import Receipts from "@/pages/Receipts";
import Lock from "@/pages/Lock";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/donations" element={<Donations />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/lock" element={<Lock />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </Router>
  );
}
