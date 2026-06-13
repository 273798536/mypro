import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import Home from "@/pages/Home";
import DataImport from "@/pages/DataImport";
import Calculator from "@/pages/Calculator";
import Exceptions from "@/pages/Exceptions";
import History from "@/pages/History";
import ReportExport from "@/pages/ReportExport";
import Guide from "@/pages/Guide";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/history" element={<History />} />
          <Route path="/report" element={<ReportExport />} />
          <Route path="/guide" element={<Guide />} />
        </Route>
      </Routes>
    </Router>
  );
}
