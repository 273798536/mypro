import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import SectionView from "./pages/SectionView";
import RecordsList from "./pages/RecordsList";
import RecordDetail from "./pages/RecordDetail";
import Render3D from "./pages/Render3D";
import DuplicateTest from "./pages/DuplicateTest";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-bg-primary text-text-primary">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Navigate to="/section" replace />} />
          <Route path="/section" element={<SectionView />} />
          <Route path="/records" element={<RecordsList />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/render-3d" element={<Render3D />} />
          <Route path="/test" element={<DuplicateTest />} />
          <Route path="*" element={<Navigate to="/section" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
