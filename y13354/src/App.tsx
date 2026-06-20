import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import Overview from '@/pages/Overview';
import Samples from '@/pages/Samples';
import History from '@/pages/History';
import SampleDrawer from '@/components/SampleDrawer';
import OverrideModal from '@/components/OverrideModal';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { useEffect } from 'react';

function AppContent() {
  const { init, currentSnapshot } = useGatekeeperStore();
  useEffect(() => {
    if (!currentSnapshot) init();
  }, [currentSnapshot, init]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:40px_40px] pointer-events-none" />
      <NavBar />
      <main className="relative ml-60 min-h-screen p-8">
        <div className="mx-auto max-w-[1400px]">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/samples" element={<Samples />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </main>
      <SampleDrawer />
      <OverrideModal />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
