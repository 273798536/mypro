import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Workbench from "@/pages/Workbench";
import Classification from "@/pages/Classification";
import Diagnosis from "@/pages/Diagnosis";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/classification" element={<Classification />} />
          <Route path="/diagnosis" element={<Diagnosis />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </Router>
  );
}
