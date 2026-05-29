import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/ui/Sidebar';
import Dashboard from './pages/Dashboard';
import Dealers from './pages/Dealers';
import SalesOrders from './pages/SalesOrders';
import Payments from './pages/Payments';
import Agreements from './pages/Agreements';
import TrialCalculate from './pages/TrialCalculate';
import TrialCompare from './pages/TrialCompare';
import Corrections from './pages/Corrections';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data/dealers" element={<Dealers />} />
            <Route path="/data/sales" element={<SalesOrders />} />
            <Route path="/data/payments" element={<Payments />} />
            <Route path="/agreement/list" element={<Agreements />} />
            <Route path="/agreement/trace" element={<Agreements />} />
            <Route path="/trial/calculate" element={<TrialCalculate />} />
            <Route path="/trial/compare" element={<TrialCompare />} />
            <Route path="/correction/suggestions" element={<Corrections />} />
            <Route path="/report/preview" element={<Reports />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
