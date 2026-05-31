import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CompareModal from './components/CompareModal';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Bills from './pages/Bills';
import Reports from './pages/Reports';
import History from './pages/History';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-100">
        <Sidebar />
        <main className="ml-60 min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
        <CompareModal />
      </div>
    </Router>
  );
}
