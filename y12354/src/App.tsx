import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import DiagnosisPage from "@/pages/DiagnosisPage";
import CluesPage from "@/pages/CluesPage";
import TracePage from "@/pages/TracePage";
import ProblemsPage from "@/pages/ProblemsPage";
import SamplesPage from "@/pages/SamplesPage";

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/diagnosis" replace />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/clues" element={<CluesPage />} />
          <Route path="/trace" element={<TracePage />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/samples" element={<SamplesPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
