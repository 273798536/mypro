import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import BuoyData from "@/pages/BuoyData";
import WaterWarning from "@/pages/WaterWarning";
import HistoryView from "@/pages/HistoryView";
import ReviewCenter from "@/pages/ReviewCenter";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/buoy" element={<BuoyData />} />
          <Route path="/warning" element={<WaterWarning />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/review" element={<ReviewCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}
