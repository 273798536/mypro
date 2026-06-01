import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import Overview from "@/pages/Overview";
import Assign from "@/pages/Assign";
import Compare from "@/pages/Compare";
import ExportPage from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/assign" element={<Assign />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
