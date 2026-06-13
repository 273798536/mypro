import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TopNav from "@/components/TopNav";
import Workbench from "@/pages/Workbench";
import Reports from "@/pages/Reports";
import Handover from "@/pages/Handover";

export default function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
        <TopNav />
        <Routes>
          <Route path="/" element={<Workbench />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/handover" element={<Handover />} />
        </Routes>
      </div>
    </Router>
  );
}
