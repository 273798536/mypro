import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigation } from "./components/layout/Navigation";
import { Home } from "./pages/Home";
import { SingleCalculation } from "./pages/SingleCalculation";
import { BatchCalculation } from "./pages/BatchCalculation";
import { Results } from "./pages/Results";
import { History } from "./pages/History";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/single" element={<SingleCalculation />} />
          <Route path="/batch" element={<BatchCalculation />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </Router>
  );
}
