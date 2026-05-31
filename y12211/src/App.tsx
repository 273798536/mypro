import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { Orders } from "@/pages/Orders";
import { Derivatives } from "@/pages/Derivatives";
import { Rules } from "@/pages/Rules";
import { Exceptions } from "@/pages/Exceptions";
import { Revenue } from "@/pages/Revenue";
import { Trace, TraceForward } from "@/pages/Trace";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/derivatives" element={<Derivatives />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/exceptions" element={<Exceptions />} />
            <Route path="/revenue" element={<Revenue />} />
            <Route path="/trace" element={<Trace />} />
            <Route path="/trace/forward/:orderId" element={<TraceForward />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
