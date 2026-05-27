import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainScene from "@/pages/MainScene";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainScene />} />
      </Routes>
    </Router>
  );
}
