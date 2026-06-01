import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import CheckPage from './pages/CheckPage';
import ImportPage from './pages/ImportPage';
import DetailPage from './pages/DetailPage';
import AnalysisPage from './pages/AnalysisPage';

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<CheckPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
