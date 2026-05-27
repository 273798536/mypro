import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Workbench from "@/pages/Workbench";
import Depreciation from "@/pages/Depreciation";
import Contracts from "@/pages/Contracts";
import Maintenance from "@/pages/Maintenance";
import Repurchase from "@/pages/Repurchase";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Workbench />} />
          <Route path="/depreciation" element={<Depreciation />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/repurchase" element={<Repurchase />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </Layout>
    </Router>
  );
}
