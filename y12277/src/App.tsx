import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import { InstitutionDetail } from "@/pages/InstitutionDetail";
import { AnomalyCenter } from "@/pages/AnomalyCenter";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/institution/:id" element={<InstitutionDetail />} />
        <Route path="/anomalies" element={<AnomalyCenter />} />
      </Routes>
    </Router>
  );
}
