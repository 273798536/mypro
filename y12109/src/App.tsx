import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Workspace from "@/pages/Workspace";
import Diagnostics from "@/pages/Diagnostics";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workspace />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
        </Route>
      </Routes>
    </Router>
  );
}
