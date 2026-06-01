import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import DataEntry from "@/pages/DataEntry";
import Analysis from "@/pages/Analysis";
import Intervention from "@/pages/Intervention";
import Export from "@/pages/Export";
import { useAnalysisStore } from "@/store/useAnalysisStore";

export default function App() {
  const { loadDemoData, records } = useAnalysisStore();

  useEffect(() => {
    if (records.length === 0) {
      loadDemoData();
    }
  }, [loadDemoData, records.length]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/intervention" element={<Intervention />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
