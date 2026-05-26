import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SimulatorPage } from "@/pages/SimulatorPage";
import { ReportPage } from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimulatorPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
