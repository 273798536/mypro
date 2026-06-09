import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Compare from "@/pages/Compare";
import Anomalies from "@/pages/Anomalies";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/anomalies" element={<Anomalies />} />
      </Routes>
    </Router>
  );
}
