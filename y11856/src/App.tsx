import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectionPage from '@/pages/ProjectionPage';
import MergePage from '@/pages/MergePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectionPage />} />
        <Route path="/merge" element={<MergePage />} />
      </Routes>
    </Router>
  );
}
