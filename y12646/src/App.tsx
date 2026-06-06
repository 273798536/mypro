import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import CanvasPage from '@/pages/CanvasPage';
import DevicesPage from '@/pages/DevicesPage';
import AnalysisPage from '@/pages/AnalysisPage';
import LayersPage from '@/pages/LayersPage';
import ExamplesPage from '@/pages/ExamplesPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<CanvasPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/layers" element={<LayersPage />} />
          <Route path="/examples" element={<ExamplesPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
