import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { DataList } from "@/pages/DataList";
import { DataDetail } from "@/pages/DataDetail";
import { RecalcCompare } from "@/pages/RecalcCompare";
import { ExportDelivery } from "@/pages/ExportDelivery";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/list" element={<DataList />} />
          <Route path="/detail/:id" element={<DataDetail />} />
          <Route path="/detail" element={<Navigate to="/list" replace />} />
          <Route path="/recalc" element={<RecalcCompare />} />
          <Route path="/export" element={<ExportDelivery />} />
        </Route>
      </Routes>
    </Router>
  );
}
