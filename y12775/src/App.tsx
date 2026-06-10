import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Calculator from "@/pages/Calculator";
import Reagent from "@/pages/Reagent";
import Batch from "@/pages/Batch";
import Results from "@/pages/Results";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Calculator />} />
          <Route path="/reagent" element={<Reagent />} />
          <Route path="/batch" element={<Batch />} />
          <Route path="/results" element={<Results />} />
        </Route>
      </Routes>
    </Router>
  );
}
