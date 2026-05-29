import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import WarningDetail from "@/pages/WarningDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/warnings/:id" element={<WarningDetail />} />
      </Routes>
    </Router>
  );
}
