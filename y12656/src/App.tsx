import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ImportPage from "@/pages/ImportPage";
import RouteListPage from "@/pages/RouteListPage";
import RouteDetailPage from "@/pages/RouteDetailPage";
import ReviewWorkbenchPage from "@/pages/ReviewWorkbenchPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/routes" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/import" element={<ImportPage />} />
          <Route path="/routes" element={<RouteListPage />} />
          <Route path="/routes/:id" element={<RouteDetailPage />} />
          <Route path="/routes/:id/review" element={<ReviewWorkbenchPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/routes" replace />} />
      </Routes>
    </Router>
  );
}
