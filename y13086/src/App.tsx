import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import RecordList from "@/pages/RecordList";
import RecordDetail from "@/pages/RecordDetail";
import RecordHistory from "@/pages/RecordHistory";
import Reports from "@/pages/Reports";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/records" replace />} />
          <Route path="records" element={<RecordList />} />
          <Route path="records/:id" element={<RecordDetail />} />
          <Route path="records/:id/history" element={<RecordHistory />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
