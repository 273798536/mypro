import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ImportPage from "@/pages/ImportPage";
import DashboardPage from "@/pages/DashboardPage";
import ReviewPage from "@/pages/ReviewPage";
import TracePage from "@/pages/TracePage";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/trace/:id" element={<TracePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
