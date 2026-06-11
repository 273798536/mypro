import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReviewWorkbench from "@/pages/ReviewWorkbench";
import HistoryTimeline from "@/pages/HistoryTimeline";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ReviewWorkbench />} />
        <Route path="/timeline" element={<HistoryTimeline />} />
      </Routes>
    </Router>
  );
}
