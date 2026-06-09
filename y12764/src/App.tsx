import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import RecordList from "@/pages/RecordList";
import RecordDetail from "@/pages/RecordDetail";
import ReportPreview from "@/pages/ReportPreview";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RecordList />} />
        <Route path="/records" element={<RecordList />} />
        <Route path="/records/:id" element={<RecordDetail />} />
        <Route path="/report/:id" element={<ReportPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
