import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { QueueList } from "@/pages/QueueList";
import { TaskDetail } from "@/pages/TaskDetail";
import { ImportPage } from "@/pages/ImportPage";
import { DeadLetterPage } from "@/pages/DeadLetterPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/queue" element={<QueueList />} />
          <Route path="/queue/:id" element={<TaskDetail />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/dead-letter" element={<DeadLetterPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
