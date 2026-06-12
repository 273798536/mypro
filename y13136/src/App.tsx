import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Workbench from '@/pages/Workbench';
import History from '@/pages/History';
import Compare from '@/pages/Compare';
import Delivery from '@/pages/Delivery';
import { initializeStore } from '@/store/useVerificationStore';

export default function App() {
  useEffect(() => {
    initializeStore();
  }, []);

  return (
    <div className="h-screen flex bg-slate-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<Workbench />} />
          <Route path="/history" element={<History />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/delivery" element={<Delivery />} />
        </Routes>
      </main>
    </div>
  );
}
