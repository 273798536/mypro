import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Volunteers from '@/pages/Volunteers';
import Stages from '@/pages/Stages';
import Schedule from '@/pages/Schedule';
import History from '@/pages/History';
import Analysis from '@/pages/Analysis';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/volunteers" element={<Volunteers />} />
          <Route path="/stages" element={<Stages />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/history" element={<History />} />
          <Route path="/analysis" element={<Analysis />} />
        </Route>
      </Routes>
    </Router>
  );
}
