import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ProblemDetail from "@/pages/ProblemDetail";
import NewProblem from "@/pages/NewProblem";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problem/new" element={<NewProblem />} />
        <Route path="/problem/:id" element={<ProblemDetail />} />
      </Routes>
    </Router>
  );
}
