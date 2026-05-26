import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Cards from '@/pages/Cards';
import CardDetail from '@/pages/CardDetail';
import Recharge from '@/pages/Recharge';
import Consume from '@/pages/Consume';
import Refund from '@/pages/Refund';
import Rules from '@/pages/Rules';
import Audit from '@/pages/Audit';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/cards/:id" element={<CardDetail />} />
          <Route path="/recharge" element={<Recharge />} />
          <Route path="/consume" element={<Consume />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/audit" element={<Audit />} />
        </Route>
      </Routes>
    </Router>
  );
}
