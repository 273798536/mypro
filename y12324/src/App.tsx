import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Layout/Navigation';
import { ImportPage } from './pages/ImportPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { ReplayPage } from './pages/ReplayPage';
import { ReportPage } from './pages/ReportPage';
import { ExportPage } from './pages/ExportPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ImportPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/replay" element={<ReplayPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </main>
        <footer className="bg-sudoku-primary text-white/80 text-center py-4 text-sm">
          <p>数独步骤纠错器 — 让数独学习更高效</p>
        </footer>
      </div>
    </Router>
  );
}
