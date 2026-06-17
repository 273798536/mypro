import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ImportPage from "@/pages/Import";
import MergePage from "@/pages/Merge";
import SummaryPage from "@/pages/Summary";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/import" replace />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/merge" element={<MergePage />} />
          <Route path="/summary" element={<SummaryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
