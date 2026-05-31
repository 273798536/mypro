import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Workspace from "@/pages/Workspace";
import Experiments from "@/pages/Experiments";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/experiments" element={<Experiments />} />
      </Routes>
    </Router>
  );
}
