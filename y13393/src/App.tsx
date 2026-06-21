import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Timeline from "@/pages/Timeline";
import Exceptions from "@/pages/Exceptions";
import Compare from "@/pages/Compare";
import Export from "@/pages/Export";
import Review from "@/pages/Review";

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/export" element={<Export />} />
          <Route path="/review" element={<Review />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
