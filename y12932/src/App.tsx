import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Overview from "@/pages/Overview";
import Samples from "@/pages/Samples";
import SampleDetail from "@/pages/SampleDetail";
import Leakage from "@/pages/Leakage";
import Reports from "@/pages/Reports";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/samples/:id" element={<SampleDetail />} />
          <Route path="/leakage" element={<Leakage />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
