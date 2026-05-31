import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VectorFieldApp from "@/pages/VectorFieldApp";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VectorFieldApp />} />
      </Routes>
    </Router>
  );
}
