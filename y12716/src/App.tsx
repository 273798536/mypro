import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import DataEditor from "@/pages/DataEditor";
import ReviewPanel from "@/pages/ReviewPanel";
import IssuesReport from "@/pages/IssuesReport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data" element={<DataEditor />} />
          <Route path="/review" element={<ReviewPanel />} />
          <Route path="/issues" element={<IssuesReport />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
