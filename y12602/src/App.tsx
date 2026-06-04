import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuditGame } from "@/pages/AuditGame";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuditGame />} />
      </Routes>
    </Router>
  );
}
