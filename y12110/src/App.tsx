import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import DataInput from "@/pages/DataInput";
import Experiments from "@/pages/Experiments";
import Results from "@/pages/Results";
import AnomalyAnalysis from "@/pages/AnomalyAnalysis";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DataInput />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/results" element={<Results />} />
          <Route path="/anomaly" element={<AnomalyAnalysis />} />
        </Route>
      </Routes>
    </Router>
  );
}
