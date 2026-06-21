import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Detail from "@/pages/Detail";
import Compare from "@/pages/Compare";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0A1628] flex">
        <Sidebar />
        <main className="flex-1 ml-56 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/detail" element={<Detail />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
