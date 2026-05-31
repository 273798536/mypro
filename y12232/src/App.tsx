import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Import from "@/pages/Import";
import Verify from "@/pages/Verify";
import Review from "@/pages/Review";
import Export from "@/pages/Export";
import Guide from "@/pages/Guide";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Import />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/review" element={<Review />} />
          <Route path="/export" element={<Export />} />
          <Route path="/guide" element={<Guide />} />
        </Route>
      </Routes>
    </Router>
  );
}
