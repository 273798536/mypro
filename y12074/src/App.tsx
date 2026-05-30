import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';
import DataImport from '@/pages/DataImport';
import Simulation from '@/pages/Simulation';
import SortingPorts from '@/pages/SortingPorts';
import AnomalyAnalysis from '@/pages/AnomalyAnalysis';
import ReportExport from '@/pages/ReportExport';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/sorting" element={<SortingPorts />} />
          <Route path="/anomalies" element={<AnomalyAnalysis />} />
          <Route path="/report" element={<ReportExport />} />
        </Route>
      </Routes>
    </Router>
  );
}
