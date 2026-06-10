import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { DataEntry } from "@/pages/DataEntry";
import { Calculator } from "@/pages/Calculator";
import { Review } from "@/pages/Review";
import { BatchReport } from "@/pages/BatchReport";
import { Help } from "@/pages/Help";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/data-entry" element={<DataEntry />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/review" element={<Review />} />
        <Route path="/batch-report" element={<BatchReport />} />
        <Route path="/help" element={<Help />} />
      </Routes>
    </Router>
  );
}
