import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ExerciseList from "@/pages/ExerciseList";
import ExerciseDetail from "@/pages/ExerciseDetail";
import ExerciseHistory from "@/pages/ExerciseHistory";
import ExerciseRevise from "@/pages/ExerciseRevise";
import ExportPage from "@/pages/ExportPage";
import RepeatImportTest from "@/pages/RepeatImportTest";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/exercises" replace />} />
          <Route path="exercises" element={<ExerciseList />} />
          <Route path="exercises/:id" element={<ExerciseDetail />} />
          <Route path="exercises/:id/history" element={<ExerciseHistory />} />
          <Route path="exercises/:id/revise" element={<ExerciseRevise />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="test/repeat-import" element={<RepeatImportTest />} />
        </Route>
      </Routes>
    </Router>
  );
}
