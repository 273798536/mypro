import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Workbench } from './pages/Workbench';
import { PortfolioManager } from './pages/PortfolioManager';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/plans" element={<PortfolioManager />} />
      </Routes>
    </Router>
  );
}
