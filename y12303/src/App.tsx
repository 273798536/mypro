import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { TerrainPage } from './pages/TerrainPage';
import { CracksPage } from './pages/CracksPage';
import { ReportPage } from './pages/ReportPage';
import { ComparePage } from './pages/ComparePage';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<TerrainPage />} />
              <Route path="/cracks" element={<CracksPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/compare" element={<ComparePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
