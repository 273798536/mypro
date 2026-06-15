import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { TaskQueuePage } from "./pages/TaskQueuePage";
import { TideCalculationPage } from "./pages/TideCalculationPage";
import { RiskAssessmentPage } from "./pages/RiskAssessmentPage";
import { ReviewWorkspacePage } from "./pages/ReviewWorkspacePage";
import { MapPanelPage } from "./pages/MapPanelPage";
import { ExportCenterPage } from "./pages/ExportCenterPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TaskQueuePage />} />
        <Route path="/tasks/:taskId/tide" element={<TideCalculationPage />} />
        <Route path="/tasks/:taskId/risk" element={<RiskAssessmentPage />} />
        <Route path="/tasks/:taskId/review" element={<ReviewWorkspacePage />} />
        <Route path="/tasks/:taskId/map" element={<MapPanelPage />} />
        <Route path="/tasks/:taskId/export" element={<ExportCenterPage />} />
        <Route path="*" element={<TaskQueuePage />} />
      </Routes>
    </Router>
  );
}
