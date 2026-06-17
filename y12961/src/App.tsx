import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Overview from "@/pages/Overview";
import RoutingDetails from "@/pages/RoutingDetails";
import SchemaDiff from "@/pages/SchemaDiff";
import AuditTrail from "@/pages/AuditTrail";
import BackupCompare from "@/pages/BackupCompare";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/routes" element={<RoutingDetails />} />
          <Route path="/schema" element={<SchemaDiff />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/backup" element={<BackupCompare />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </Router>
  );
}
