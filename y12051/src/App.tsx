import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MenuPage } from "@/pages/MenuPage";
import { GamePage } from "@/pages/GamePage";
import { ResultPage } from "@/pages/ResultPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/game/:trackId" element={<GamePage />} />
        <Route path="/result/:trackId" element={<ResultPage />} />
      </Routes>
    </Router>
  );
}
