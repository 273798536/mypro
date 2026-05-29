import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MapPage from "@/pages/MapPage";
import ImportPage from "@/pages/ImportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Routes>
    </Router>
  );
}
