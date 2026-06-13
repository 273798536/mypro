import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Workbench from "@/pages/Workbench";
import HistoryCenter from "@/pages/HistoryCenter";
import MaterialReview from "@/pages/MaterialReview";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/history" element={<HistoryCenter />} />
        <Route path="/review" element={<MaterialReview />} />
      </Routes>
    </Router>
  );
}
