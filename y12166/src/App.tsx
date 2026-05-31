import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import SimulationPage from "./pages/SimulationPage";
import SchedulePage from "./pages/SchedulePage";
import AnomalyPage from "./pages/AnomalyPage";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <main className="ml-56 flex-1 p-6">
          <Routes>
            <Route path="/" element={<SimulationPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/anomaly" element={<AnomalyPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
