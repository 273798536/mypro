import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import RefundDetail from "@/pages/RefundDetail";
import RefundExport from "@/pages/RefundExport";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/refund/:id" element={<RefundDetail />} />
        <Route path="/refund/:id/export" element={<RefundExport />} />
      </Routes>
    </Router>
  );
}
