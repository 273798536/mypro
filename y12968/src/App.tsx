import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import RecordDetail from "@/pages/RecordDetail";
import Review from "@/pages/Review";
import Export from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/record/:id" element={<RecordDetail />} />
          <Route path="/review" element={<Review />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
