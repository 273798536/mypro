import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import SettlementList from "@/pages/SettlementList";
import SettlementDetail from "@/pages/SettlementDetail";
import SettlementAmend from "@/pages/SettlementAmend";
import History from "@/pages/History";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<SettlementList />} />
          <Route path="/settlement/:id" element={<SettlementDetail />} />
          <Route path="/settlement/:id/amend" element={<SettlementAmend />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}
