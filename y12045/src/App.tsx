import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GamePage } from "@/pages/GamePage";
import { HelpPage } from "@/pages/HelpPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Router>
  );
}
