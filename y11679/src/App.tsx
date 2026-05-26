import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AnnotationPage from "@/pages/AnnotationPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnnotationPage />} />
      </Routes>
    </Router>
  );
}
