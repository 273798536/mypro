import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GamePage from "@/pages/GamePage";
import ResultPage from "@/pages/ResultPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </Router>
  );
}
