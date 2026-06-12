import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import MapHome from "@/pages/MapHome";
import ReviewDetail from "@/pages/ReviewDetail";
import TracePanel from "@/pages/TracePanel";
import CorrectionPage from "@/pages/CorrectionPage";
import DuplicateCheckPage from "@/pages/DuplicateCheckPage";
import WaterQualityPage from "@/pages/WaterQualityPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MapHome />} />
          <Route path="/review/:vesselId/:date" element={<ReviewDetail />} />
          <Route path="/review" element={<Navigate to="/" replace />} />
          <Route path="/trace" element={<TracePanel />} />
          <Route path="/trace/:recordId" element={<TracePanel />} />
          <Route path="/correction" element={<CorrectionPage />} />
          <Route path="/correction/:recordId" element={<CorrectionPage />} />
          <Route path="/duplicate" element={<DuplicateCheckPage />} />
          <Route path="/duplicate-check" element={<Navigate to="/duplicate" replace />} />
          <Route path="/alert" element={<WaterQualityPage />} />
          <Route path="/water-quality" element={<Navigate to="/alert" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
