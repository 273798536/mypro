import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ImportPage from "@/pages/ImportPage";
import CalculationPage from "@/pages/CalculationPage";
import TrackingPage from "@/pages/TrackingPage";
import ChainTracePage from "@/pages/ChainTracePage";
import BindTestPage from "@/pages/BindTestPage";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/calculation" element={<CalculationPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/chain-trace" element={<ChainTracePage />} />
          <Route path="/bind-test" element={<BindTestPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
