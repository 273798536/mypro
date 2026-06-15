import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useComplaintStore } from "./store/useComplaintStore";
import { ComplaintList } from "./pages/ComplaintList";
import { NewComplaint } from "./pages/NewComplaint";
import { ComplaintDetail } from "./pages/ComplaintDetail";
import { ReportPage } from "./pages/ReportPage";
import { LogsPage } from "./pages/LogsPage";

export default function App() {
  const fetchComplaints = useComplaintStore(state => state.fetchComplaints);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ComplaintList />} />
        <Route path="/complaint/new" element={<NewComplaint />} />
        <Route path="/complaint/:id" element={<ComplaintDetail />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </Router>
  );
}
