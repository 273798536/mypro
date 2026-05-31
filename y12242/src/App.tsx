import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CaseHall from "@/pages/CaseHall";
import CaseReview from "@/pages/CaseReview";
import ReportReplay from "@/pages/ReportReplay";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CaseHall />} />
        <Route path="/case/:id" element={<CaseReview />} />
        <Route path="/report/:id" element={<ReportReplay />} />
      </Routes>
    </Router>
  );
}
