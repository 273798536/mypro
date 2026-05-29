import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DataImportPage from './pages/DataImportPage';
import AnalyzerPage from './pages/AnalyzerPage';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DataImportPage />} />
        <Route path="/analyzer" element={<AnalyzerPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}

export default App;
