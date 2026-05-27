import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ExperimentPage } from "@/pages/ExperimentPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ExperimentPage />} />
      </Routes>
    </Router>
  );
}
