import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import { ReportPage } from "@/pages/ReportPage";
import { ToastContainer } from "@/components/common/Toast";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}
