import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GamePage from "@/pages/GamePage";
import ReviewPage from "@/pages/ReviewPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/review" element={<ReviewPage />} />
      </Routes>
    </Router>
  );
}
