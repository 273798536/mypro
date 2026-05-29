import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import Campaigns from './pages/Campaigns';
import Refunds from './pages/Refunds';
import Allocation from './pages/Allocation';
import Reports from './pages/Reports';
import { useLedgerStore } from './store/useLedgerStore';

function App() {
  const { initData } = useLedgerStore();

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/allocation" element={<Allocation />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
