import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Workspace from "@/pages/Workspace";
import Annotations from "@/pages/Annotations";
import Handover from "@/pages/Handover";
import { useInitializeScreenshots } from "@/hooks/useInitializeScreenshots";

export default function App() {
  useInitializeScreenshots();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/annotations" element={<Annotations />} />
        <Route path="/handover" element={<Handover />} />
      </Routes>
    </Router>
  );
}
