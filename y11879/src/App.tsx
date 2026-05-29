import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import ImportPage from "@/pages/ImportPage";
import RulesPage from "@/pages/RulesPage";
import ReviewPage from "@/pages/ReviewPage";
import TracePage from "@/pages/TracePage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-900">
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/trace" element={<TracePage />} />
        </Routes>
      </div>
    </Router>
  );
}
