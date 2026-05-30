import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Review from "@/pages/Review";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review" element={<Review />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </Router>
  );
}
