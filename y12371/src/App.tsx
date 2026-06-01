import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ScoreDetail from "@/pages/ScoreDetail";
import Tasks from "@/pages/Tasks";
import Trace from "@/pages/Trace";
import Navbar from "@/components/Navbar";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/score/:id" element={<ScoreDetail />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/trace" element={<Trace />} />
        </Routes>
      </div>
    </Router>
  );
}
