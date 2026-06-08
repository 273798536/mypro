import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import RecordsList from "@/pages/RecordsList";
import RecordDetail from "@/pages/RecordDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/records" replace />} />
        <Route path="/records" element={<RecordsList />} />
        <Route path="/records/:id" element={<RecordDetail />} />
      </Routes>
    </Router>
  );
}
