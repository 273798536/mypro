import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Lobby from "@/pages/Lobby";
import Workspace from "@/pages/Workspace";
import Review from "@/pages/Review";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/workspace/:levelId" element={<Workspace />} />
        <Route path="/review/:levelId" element={<Review />} />
      </Routes>
    </Router>
  );
}
