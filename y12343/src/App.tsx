import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Coils from "@/pages/Coils";
import Magnetic from "@/pages/Magnetic";
import Reports from "@/pages/Reports";
import ReportDetail from "@/pages/ReportDetail";
import History from "@/pages/History";
import Replay from "@/pages/Replay";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/coils" element={<Coils />} />
          <Route path="/magnetic" element={<Magnetic />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/replay" element={<Replay />} />
        </Route>
      </Routes>
    </Router>
  );
}
