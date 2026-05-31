import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Series from "@/pages/Series";
import SeriesDetail from "@/pages/SeriesDetail";
import Cost from "@/pages/Cost";
import CalculationDetail from "@/pages/CalculationDetail";
import Exceptions from "@/pages/Exceptions";
import Export from "@/pages/Export";
import { useAppStore } from "@/store";
import { useEffect } from "react";

function App() {
  const initializeData = useAppStore(state => state.initializeData);
  
  useEffect(() => {
    initializeData();
  }, [initializeData]);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="series" element={<Series />} />
          <Route path="series/:id" element={<SeriesDetail />} />
          <Route path="cost" element={<Cost />} />
          <Route path="calculation/:id" element={<CalculationDetail />} />
          <Route path="exceptions" element={<Exceptions />} />
          <Route path="export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
