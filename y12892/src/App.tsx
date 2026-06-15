import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ComputePage from "@/pages/ComputePage";
import ReviewPage from "@/pages/ReviewPage";
import TracePage from "@/pages/TracePage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ComputePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="trace" element={<TracePage />} />
          <Route path="export" element={<ExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
