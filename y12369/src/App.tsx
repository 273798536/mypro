import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import DataInput from "@/pages/DataInput";
import Results from "@/pages/Results";
import Compare from "@/pages/Compare";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DataInput />} />
          <Route path="/results" element={<Results />} />
          <Route path="/compare" element={<Compare />} />
        </Route>
      </Routes>
    </Router>
  );
}
