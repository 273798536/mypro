import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GamePage } from "@/pages/GamePage";
import { SettlementPage } from "@/pages/SettlementPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { Guide } from "@/pages/Guide";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/guide" element={<Guide />} />
      </Routes>
    </Router>
  );
}
