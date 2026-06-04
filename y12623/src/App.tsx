import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Anomalies from "@/pages/Anomalies";
import RecordDetail from "@/pages/RecordDetail";
import Export from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/record/:id" element={<RecordDetail />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </Layout>
    </Router>
  );
}
