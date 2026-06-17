import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/Layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Materials from "@/pages/Materials";
import Workbench from "@/pages/Workbench";
import Review from "@/pages/Review";
import History from "@/pages/History";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/review" element={<Review />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
