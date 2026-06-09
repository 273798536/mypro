import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Workbench from "@/pages/Workbench";
import SampleDetail from "@/pages/SampleDetail";
import ReviewCenter from "@/pages/ReviewCenter";
import DraftManager from "@/pages/DraftManager";
import ExportReport from "@/pages/ExportReport";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Workbench />} />
          <Route path="/sample/:id" element={<SampleDetail />} />
          <Route path="/review" element={<ReviewCenter />} />
          <Route path="/draft" element={<DraftManager />} />
          <Route path="/export" element={<ExportReport />} />
        </Routes>
      </Layout>
    </Router>
  );
}
