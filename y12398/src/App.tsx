import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { Records } from './pages/Records';
import { Anomalies } from './pages/Anomalies';
import { Inventory } from './pages/Inventory';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/records" element={<Records />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/inventory" element={<Inventory />} />
        </Routes>
      </Layout>
    </Router>
  );
}
