import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { ImportPage } from './pages/ImportPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { VersionPage } from './pages/VersionPage';
import { AnomalyDetailPage } from './pages/AnomalyDetailPage';
import { ExportPage } from './pages/ExportPage';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/version" element={<VersionPage />} />
        <Route path="/anomaly/:id" element={<AnomalyDetailPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
