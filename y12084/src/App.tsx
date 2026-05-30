import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import EvaluationPage from "@/pages/EvaluationPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
      </Routes>
    </Router>
  );
}
