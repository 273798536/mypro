import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Board from "@/pages/Board";
import Dispatch from "@/pages/Dispatch";
import Conflict from "@/pages/Conflict";
import Settlement from "@/pages/Settlement";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/conflict" element={<Conflict />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
