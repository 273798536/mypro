import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CalculatorWorkbench } from "@/pages/CalculatorWorkbench";
import { DataImport } from "@/pages/DataImport";
import { VersionTracker } from "@/pages/VersionTracker";
import { DataTrace } from "@/pages/DataTrace";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<CalculatorWorkbench />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/versions" element={<VersionTracker />} />
        </Route>
        <Route path="/trace/:versionId" element={<DataTrace />} />
      </Routes>
    </Router>
  );
}
