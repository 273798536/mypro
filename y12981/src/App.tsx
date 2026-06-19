import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import AuditHistory from "@/pages/AuditHistory";
import Dictionary from "@/pages/Dictionary";
import Permissions from "@/pages/Permissions";
import BoundaryCases from "@/pages/BoundaryCases";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/audit" element={<AuditHistory />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/boundary" element={<BoundaryCases />} />
        </Route>
      </Routes>
    </Router>
  );
}
