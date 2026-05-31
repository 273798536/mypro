import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ImportPage from "@/pages/ImportPage";
import ValuationPage from "@/pages/ValuationPage";
import ChangesPage from "@/pages/ChangesPage";
import ComparePage from "@/pages/ComparePage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/valuation" element={<ValuationPage />} />
          <Route path="/changes" element={<ChangesPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
