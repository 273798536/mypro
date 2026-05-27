import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/Toast";
import Home from "@/pages/Home";
import Audit from "@/pages/Audit";

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/audit" element={<Audit />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
