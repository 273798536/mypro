import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { PointDetail } from "@/pages/PointDetail";
import { Timeline } from "@/pages/Timeline";
import { ImportPage } from "@/pages/ImportPage";
import { Layout } from "@/components/Layout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/point/:id" element={<PointDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/import" element={<ImportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
