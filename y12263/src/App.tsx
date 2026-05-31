import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GamePage from "@/pages/GamePage";
import RecordsPage from "@/pages/RecordsPage";
import RulesPage from "@/pages/RulesPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Routes>
      </div>
    </Router>
  );
}
