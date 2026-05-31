import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Workspace from "@/pages/Workspace";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/workspace" element={<Workspace />} />
      </Routes>
    </Router>
  );
}
