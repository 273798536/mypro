import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Home from "@/pages/Home";
import BatchDetail from "@/pages/BatchDetail";
import SampleList from "@/pages/SampleList";
import LineageTrace from "@/pages/LineageTrace";
import TestPath from "@/pages/TestPath";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/batch/:id" element={<BatchDetail />} />
          <Route path="/samples" element={<SampleList />} />
          <Route path="/lineage/:id" element={<LineageTrace />} />
          <Route path="/test-path" element={<TestPath />} />
        </Route>
      </Routes>
    </Router>
  );
}
