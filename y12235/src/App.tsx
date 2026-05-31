import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Battle from '@/pages/Battle';
import Settlement from '@/pages/Settlement';
import Records from '@/pages/Records';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/battle/:scenarioId" element={<Battle />} />
        <Route path="/settlement/:scenarioId/:runId" element={<Settlement />} />
        <Route path="/records" element={<Records />} />
      </Routes>
    </Router>
  );
}
