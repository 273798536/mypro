import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import DataImport from '@/pages/DataImport';
import Overview from '@/pages/Overview';
import Replenishment from '@/pages/Replenishment';
import Anomaly from '@/pages/Anomaly';
import Compare from '@/pages/Compare';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-neutral-100 flex">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DataImport />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/replenishment" element={<Replenishment />} />
            <Route path="/anomaly" element={<Anomaly />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
