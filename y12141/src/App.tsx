import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { CalculationPage } from '@/pages/CalculationPage';
import { FrequencyAnalysisPage } from '@/pages/FrequencyAnalysisPage';
import { MaterialsPage } from '@/pages/MaterialsPage';
import { MapPage } from '@/pages/MapPage';
import { GuidePage } from '@/pages/GuidePage';

export default function App() {
  return (
    <Router>
      <Sidebar />
      <Routes>
        <Route path="/" element={<CalculationPage />} />
        <Route path="/frequency" element={<FrequencyAnalysisPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/guide" element={<GuidePage />} />
      </Routes>
    </Router>
  );
}
