import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GalleryPage from "@/pages/GalleryPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GalleryPage />} />
      </Routes>
    </Router>
  );
}
