import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnalysisPage } from "@/pages/AnalysisPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnalysisPage />} />
      </Routes>
    </Router>
  );
}
