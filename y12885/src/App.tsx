import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import Sidebar from './components/Sidebar';
import NotificationToast from './components/NotificationToast';
import Dashboard from './pages/Dashboard';
import Visualization from './pages/Visualization';
import CleaningWorkbench from './pages/CleaningWorkbench';
import WaterQualityCenter from './pages/WaterQualityCenter';
import ReviewApproval from './pages/ReviewApproval';
import HistoryTraceback from './pages/HistoryTraceback';

export default function App() {
  const { viewMode } = useAppStore();

  return (
    <Router>
      <div className="min-h-screen bg-ocean-950">
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <Dashboard />
                </div>
              </div>
            }
          />
          <Route
            path="/visualization"
            element={
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <Visualization />
                </div>
              </div>
            }
          />
          <Route
            path="/cleaning"
            element={
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <CleaningWorkbench />
                </div>
              </div>
            }
          />
          <Route
            path="/water-quality"
            element={
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <WaterQualityCenter />
                </div>
              </div>
            }
          />
          <Route
            path="/review"
            element={
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <ReviewApproval />
                </div>
              </div>
            }
          />
          <Route
            path="/history"
            element={
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex-1 overflow-auto">
                  <HistoryTraceback />
                </div>
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <NotificationToast />
      </div>
    </Router>
  );
}
