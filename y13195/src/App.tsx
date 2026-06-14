import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import HistoryPage from "@/pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history/:recordId" element={<HistoryPage />} />
      </Routes>
    </Router>
  );
}
