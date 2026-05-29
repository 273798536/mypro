import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Workbench from "@/pages/Workbench";
import RefundDetail from "@/pages/RefundDetail";
import PendingExport from "@/pages/PendingExport";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Workbench />} />
          <Route path="/refund/:id" element={<RefundDetail />} />
          <Route path="/pending-export" element={<PendingExport />} />
        </Routes>
      </Layout>
    </Router>
  );
}
