import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Experiment from "@/pages/Experiment";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/experiment" element={<Experiment />} />
            <Route path="/report" element={<ReportPage />} />
          </Routes>
        </main>
        <footer className="border-t border-ocean-800/60 py-3 px-6 text-center text-[11px] text-ocean-500">
          🌊 潮汐发电闸门演示系统 · 为海洋课堂教学设计 · 物理模型基于真实潮汐发电站原理
        </footer>
      </div>
    </Router>
  );
}
