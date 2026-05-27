import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Simulation } from './pages/Simulation';
import { Report } from './pages/Report';
import { History } from './pages/History';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/report" element={<Report />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
