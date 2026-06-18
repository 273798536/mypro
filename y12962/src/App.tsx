import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Review from "@/pages/Review";
import Runs from "@/pages/Runs";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/review" element={<Review />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
