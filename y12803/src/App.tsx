import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import GroupStats from "@/pages/GroupStats";
import CurveDetail from "@/pages/CurveDetail";
import CultivationRecords from "@/pages/CultivationRecords";
import QCImport from "@/pages/QCImport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<GroupStats />} />
          <Route path="/curve/:groupId" element={<CurveDetail />} />
          <Route path="/records" element={<CultivationRecords />} />
          <Route path="/qc" element={<QCImport />} />
        </Route>
      </Routes>
    </Router>
  );
}
