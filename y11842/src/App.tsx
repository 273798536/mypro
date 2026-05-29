import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GameBoard } from "@/pages/GameBoard";
import { SettlementPage } from "@/pages/SettlementPage";
import { BadNodeDemo } from "@/pages/BadNodeDemo";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameBoard />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/bad-node-demo" element={<BadNodeDemo />} />
      </Routes>
    </Router>
  );
}
