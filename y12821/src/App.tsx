import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SampleListPage } from "@/pages/SampleListPage";
import { SampleDetailPage } from "@/pages/SampleDetailPage";
import { AuditLogPage } from "@/pages/AuditLogPage";
import { ReportPage } from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SampleListPage />} />
          <Route path="/sample/:id" element={<SampleDetailPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
