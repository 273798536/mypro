import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Detail } from "@/pages/Detail";
import { Docs } from "@/pages/Docs";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </Router>
  );
}
