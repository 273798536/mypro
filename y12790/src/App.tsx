import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Records from "@/pages/Records";
import RecordDetail from "@/pages/RecordDetail";
import Analysis from "@/pages/Analysis";
import Review from "@/pages/Review";
import Export from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/records" element={<Records />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/analysis/:id" element={<Analysis />} />
          <Route path="/review" element={<Review />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
