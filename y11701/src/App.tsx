import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Workbench from '@/pages/Workbench';
import Scenarios from '@/pages/Scenarios';
import Schemes from '@/pages/Schemes';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/schemes" element={<Schemes />} />
      </Routes>
    </Router>
  );
}
