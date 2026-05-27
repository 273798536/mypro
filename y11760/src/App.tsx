import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sandbox from "@/pages/Sandbox";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Sandbox />} />
      </Routes>
    </Router>
  );
}
