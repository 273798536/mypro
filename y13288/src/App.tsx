import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Workbench from "@/pages/Workbench";
import Merge from "@/pages/Merge";
import Check from "@/pages/Check";
import ExportCenter from "@/pages/ExportCenter";
import Handover from "@/pages/Handover";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workbench />} />
          <Route path="/merge" element={<Merge />} />
          <Route path="/check" element={<Check />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/handover" element={<Handover />} />
        </Route>
      </Routes>
    </Router>
  );
}
