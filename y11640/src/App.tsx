import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GamePage } from "@/pages/GamePage";
import { ReportPage } from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
