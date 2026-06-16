import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ComplaintList from "@/pages/ComplaintList";
import ComplaintDetail from "@/pages/ComplaintDetail";
import History from "@/pages/History";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ComplaintList />} />
          <Route path="complaint/:id" element={<ComplaintDetail />} />
          <Route path="history" element={<History />} />
          <Route path="export" element={<ExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
