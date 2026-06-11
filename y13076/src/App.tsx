import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TimeSeriesPlayback from "@/pages/TimeSeriesPlayback";
import AnomalyQueue from "@/pages/AnomalyQueue";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TimeSeriesPlayback />} />
        <Route path="/anomaly-queue" element={<AnomalyQueue />} />
      </Routes>
    </Router>
  );
}
