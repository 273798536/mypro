import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ConsolePage from "@/pages/ConsolePage";
import ResultPage from "@/pages/ResultPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ConsolePage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </Router>
  );
}
