import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import ImportPage from "@/pages/ImportPage";
import ThresholdPage from "@/pages/ThresholdPage";
import WorkOrderPage from "@/pages/WorkOrderPage";
import CorrectionPage from "@/pages/CorrectionPage";
import { useStore } from "@/store/useStore";

function App() {
  const initializeData = useStore((state) => state.initializeData);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/threshold" element={<ThresholdPage />} />
          <Route path="/workorder" element={<WorkOrderPage />} />
          <Route path="/correction" element={<CorrectionPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
