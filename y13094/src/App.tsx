import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SchemeList from "@/pages/SchemeList";
import SchemeDetail from "@/pages/SchemeDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SchemeList />} />
        <Route path="/scheme/:id" element={<SchemeDetail />} />
      </Routes>
    </Router>
  );
}
