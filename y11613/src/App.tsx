import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Cards from '@/pages/Cards';
import CardDetail from '@/pages/CardDetail';
import Recharge from '@/pages/Recharge';
import Consume from '@/pages/Consume';
import Refund from '@/pages/Refund';
import Rules from '@/pages/Rules';
import Audit from '@/pages/Audit';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="cards" element={<Cards />} />
          <Route path="cards/:id" element={<CardDetail />} />
          <Route path="recharge" element={<Recharge />} />
          <Route path="consume" element={<Consume />} />
          <Route path="refund" element={<Refund />} />
          <Route path="rules" element={<Rules />} />
          <Route path="audit" element={<Audit />} />
        </Route>
      </Routes>
    </Router>
  );
}
