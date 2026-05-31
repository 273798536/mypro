import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Flight from "@/pages/Flight";
import Settlement from "@/pages/Settlement";
import Review from "@/pages/Review";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flight" element={<Flight />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/review" element={<Review />} />
        <Route path="/report" element={<Report />} />
        <Route path="/report/:reportId" element={<Report />} />
      </Routes>
    </Router>
  );
}
