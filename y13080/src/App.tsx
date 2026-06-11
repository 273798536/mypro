import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import BadData from "@/pages/BadData";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bad-data" element={<BadData />} />
      </Routes>
    </Router>
  );
}
