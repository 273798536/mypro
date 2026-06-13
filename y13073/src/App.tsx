import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ProfileChartPage } from "@/pages/ProfileChartPage";
import { CsvDetailPage } from "@/pages/CsvDetailPage";
import { FieldMappingPage } from "@/pages/FieldMappingPage";
import { ToastContainer } from "@/components/common/ToastContainer";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProfileChartPage />} />
        <Route path="/csv" element={<CsvDetailPage />} />
        <Route path="/mapping" element={<FieldMappingPage />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}
