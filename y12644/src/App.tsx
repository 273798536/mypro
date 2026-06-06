import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import CanvasPage from "@/pages/CanvasPage";
import RecordsPage from "@/pages/RecordsPage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/canvas" replace />} />
          <Route path="canvas" element={<CanvasPage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="export" element={<ExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
