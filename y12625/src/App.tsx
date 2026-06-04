import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Experiment from "@/pages/Experiment";
import Result from "@/pages/Result";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/experiment/:levelId" element={<Experiment />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </Router>
  );
}
