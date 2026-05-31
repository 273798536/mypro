import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PlaylistListPage from "@/pages/PlaylistListPage";
import ImportPage from "@/pages/ImportPage";
import PlaylistEditPage from "@/pages/PlaylistEditPage";
import ValidatePage from "@/pages/ValidatePage";
import HistoryPage from "@/pages/HistoryPage";
import ReportPage from "@/pages/ReportPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <Router>
      <Header />
      <Sidebar />
      <Routes>
        <Route path="/" element={<PlaylistListPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/playlist/:id" element={<PlaylistEditPage />} />
        <Route path="/playlist/:id/validate" element={<ValidatePage />} />
        <Route path="/playlist/:id/history" element={<HistoryPage />} />
        <Route path="/playlist/:id/report" element={<ReportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}
