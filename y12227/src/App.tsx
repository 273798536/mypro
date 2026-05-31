import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { DataImport } from "@/pages/DataImport";
import { Ledger } from "@/pages/Ledger";
import { Allocation } from "@/pages/Allocation";
import { Exceptions } from "@/pages/Exceptions";
import { Analysis } from "@/pages/Analysis";
import { Trace } from "@/pages/Trace";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/allocation" element={<Allocation />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/trace" element={<Trace />} />
        </Route>
      </Routes>
    </Router>
  );
}
