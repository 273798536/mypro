import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import RentalLedger from "@/pages/RentalLedger";
import DataEntry from "@/pages/DataEntry";
import RepairSummary from "@/pages/RepairSummary";
import Reconciliation from "@/pages/Reconciliation";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<RentalLedger />} />
          <Route path="/entry" element={<DataEntry />} />
          <Route path="/repair" element={<RepairSummary />} />
          <Route path="/summary" element={<Reconciliation />} />
        </Route>
      </Routes>
    </Router>
  );
}
