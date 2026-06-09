import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TopNav from "@/components/layout/TopNav";
import ConstraintPage from "@/pages/ConstraintPage";
import FormulaPage from "@/pages/FormulaPage";
import LogsPage from "@/pages/LogsPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-ivory">
        <TopNav />
        <Routes>
          <Route path="/" element={<ConstraintPage />} />
          <Route path="/formula" element={<FormulaPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </div>
    </Router>
  );
}
