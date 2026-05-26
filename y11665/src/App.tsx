import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sandbox from "@/pages/Sandbox";
import Playback from "@/pages/Playback";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Sandbox />} />
        <Route path="/playback" element={<Playback />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </Router>
  );
}
