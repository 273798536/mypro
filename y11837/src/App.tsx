import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import MergePage from "@/pages/MergePage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge" element={<MergePage />} />
      </Routes>
    </Router>
  );
}
