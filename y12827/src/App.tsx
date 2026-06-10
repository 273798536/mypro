import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ScreeningOverview from "@/pages/ScreeningOverview";
import ScreeningDetail from "@/pages/ScreeningDetail";
import ReviewList from "@/pages/ReviewList";
import ReviewDetail from "@/pages/ReviewDetail";
import CultureList from "@/pages/CultureList";
import CultureDetail from "@/pages/CultureDetail";
import Reports from "@/pages/Reports";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ScreeningOverview />} />
          <Route path="/screening/:batchId" element={<ScreeningDetail />} />
          <Route path="/review" element={<ReviewList />} />
          <Route path="/review/:anomalyId" element={<ReviewDetail />} />
          <Route path="/cultures" element={<CultureList />} />
          <Route path="/cultures/:recordId" element={<CultureDetail />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
