import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import DeclarationDetail from "@/pages/DeclarationDetail";
import ReviewShot from "@/pages/ReviewShot";
import CaseLibrary from "@/pages/CaseLibrary";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/declaration/:id" element={<DeclarationDetail />} />
        <Route path="/declaration/:id/review-shot" element={<ReviewShot />} />
        <Route path="/case-library" element={<CaseLibrary />} />
      </Routes>
    </Router>
  );
}
