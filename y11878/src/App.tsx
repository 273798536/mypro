import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Trace from "@/pages/Trace";
import Scenario from "@/pages/Scenario";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-base-900">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/trace" element={<Trace />} />
              <Route path="/scenario" element={<Scenario />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
