import { Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/Layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import TransactionDetail from '@/pages/TransactionDetail';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transaction/:id" element={<TransactionDetail />} />
      </Routes>
    </AppLayout>
  );
}
