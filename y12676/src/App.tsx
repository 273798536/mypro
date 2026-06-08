
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ImportPage } from './pages/ImportPage';
import { DetectionPage } from './pages/DetectionPage';
import { VisualizationPage } from './pages/VisualizationPage';
import { TimelinePage } from './pages/TimelinePage';
import { ProblemSolvingPage } from './pages/ProblemSolvingPage';
import { ReportPage } from './pages/ReportPage';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<ImportPage />} />
            <Route path="/detection" element={<DetectionPage />} />
            <Route path="/visualization" element={<VisualizationPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/problem-solving" element={<ProblemSolvingPage />} />
            <Route path="/report" element={<ReportPage />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
