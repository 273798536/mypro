import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ImportPage from "@/pages/ImportPage";
import GamePage from "@/pages/GamePage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ImportPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
