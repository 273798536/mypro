import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ParameterInput } from './pages/ParameterInput';
import { Comparison } from './pages/Comparison';
import { Anomalies } from './pages/Anomalies';
import { ManualCorrection } from './pages/ManualCorrection';
import { Report } from './pages/Report';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/parameter-input" element={<ParameterInput />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/manual-correction" element={<ManualCorrection />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
