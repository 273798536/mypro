import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store/useStore";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TicketList from "./pages/TicketList";
import SegmentManagement from "./pages/SegmentManagement";
import RebookCalculator from "./pages/RebookCalculator";
import RebookDetail from "./pages/RebookDetail";
import ReviewList from "./pages/ReviewList";
import HistoryList from "./pages/HistoryList";
import ReportsCenter from "./pages/ReportsCenter";
import Settings from "./pages/Settings";
import Layout from "./components/Layout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/segments"
          element={
            <ProtectedRoute>
              <SegmentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rebook/new"
          element={
            <ProtectedRoute>
              <RebookCalculator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rebook/:id"
          element={
            <ProtectedRoute>
              <RebookCalculator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rebook/detail/:id"
          element={
            <ProtectedRoute>
              <RebookDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review"
          element={
            <ProtectedRoute>
              <ReviewList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
