import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainMenu } from "./pages/MainMenu";
import { GamePage } from "./pages/GamePage";
import { SettlementPage } from "./pages/SettlementPage";
import { DataManagementPage } from "./pages/DataManagementPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game/:levelId" element={<GamePage />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/data" element={<DataManagementPage />} />
      </Routes>
    </Router>
  );
}
