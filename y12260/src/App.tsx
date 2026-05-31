import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GamePage } from "@/pages/GamePage";
import { ResultPage } from "@/pages/ResultPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { ReportPage } from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
