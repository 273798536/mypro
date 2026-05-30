import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SceneSelect from "@/pages/SceneSelect";
import Rehearsal from "@/pages/Rehearsal";
import Result from "@/pages/Result";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SceneSelect />} />
        <Route path="/rehearsal/:sceneId" element={<Rehearsal />} />
        <Route path="/result/:sceneId" element={<Result />} />
      </Routes>
    </Router>
  );
}
