import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Settlement from "@/pages/Settlement";
import Replay from "@/pages/Replay";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/replay" element={<Replay />} />
      </Routes>
    </Router>
  );
}
