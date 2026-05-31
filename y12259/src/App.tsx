import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import GamePage from "@/pages/GamePage";
import SettlementPage from "@/pages/SettlementPage";
import ReportPage from "@/pages/ReportPage";
import { useGameStore } from "@/store/gameStore";

function GameRouter() {
  const { phase } = useGameStore();

  switch (phase) {
    case "idle":
      return <HomePage />;
    case "playing":
      return <GamePage />;
    case "settlement":
      return <SettlementPage />;
    case "report":
      return <ReportPage />;
    default:
      return <HomePage />;
  }
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<GameRouter />} />
      </Routes>
    </Router>
  );
}
