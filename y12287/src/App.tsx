import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Correction from "@/pages/Correction";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/correction" element={<Correction />} />
      </Routes>
    </Router>
  );
}
