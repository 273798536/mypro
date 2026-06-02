import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Materials from "@/pages/Materials";
import Normalization from "@/pages/Normalization";
import Comparison from "@/pages/Comparison";
import Search from "@/pages/Search";
import Export from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Materials />} />
          <Route path="/normalization" element={<Normalization />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/search" element={<Search />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
