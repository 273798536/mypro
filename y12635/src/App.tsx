import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Editor } from "@/pages/Editor";
import { Result } from "@/pages/Result";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/result/:id" element={<Result />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}
