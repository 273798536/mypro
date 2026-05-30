import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Review from "@/pages/Review";
import Guide from "@/pages/Guide";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review" element={<Review />} />
        <Route path="/guide" element={<Guide />} />
      </Routes>
    </Router>
  );
}
