import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import RecordsList from "@/pages/RecordsList";
import RecordDetail from "@/pages/RecordDetail";
import RecordEdit from "@/pages/RecordEdit";
import RecordHistory from "@/pages/RecordHistory";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/records" replace />} />
          <Route path="/records" element={<RecordsList />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/records/:id/edit" element={<RecordEdit />} />
          <Route path="/records/:id/history" element={<RecordHistory />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
