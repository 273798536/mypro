import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ComparisonPage from "@/pages/ComparisonPage";
import LedgerPage from "@/pages/LedgerPage";
import FieldPage from "@/pages/FieldPage";
import HistoryPage from "@/pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ComparisonPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/field" element={<FieldPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
