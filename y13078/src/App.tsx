import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ColdAisleProfile from "@/pages/ColdAisleProfile";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ColdAisleProfile />} />
      </Routes>
    </Router>
  );
}
