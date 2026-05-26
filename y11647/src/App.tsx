import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { SimulationPage } from './pages/SimulationPage';
import { ReportPage } from './pages/ReportPage';
import { HistoryPage } from './pages/HistoryPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Router>
  );
}
