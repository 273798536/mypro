import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Workbench from "@/pages/Workbench";
import Results from "@/pages/Results";
import Diagnosis from "@/pages/Diagnosis";
import Trends from "@/pages/Trends";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workbench />} />
          <Route path="/results" element={<Results />} />
          <Route path="/diagnosis" element={<Diagnosis />} />
          <Route path="/trends" element={<Trends />} />
        </Route>
      </Routes>
    </Router>
  );
}
