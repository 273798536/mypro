import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Compare } from "@/pages/Compare";
import { Export } from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/export" element={<Export />} />
      </Routes>
    </Router>
  );
}
