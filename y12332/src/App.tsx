import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import ImportCenter from '@/pages/ImportCenter';
import DetailQuery from '@/pages/DetailQuery';
import CompareAnalysis from '@/pages/CompareAnalysis';
import Diagnosis from '@/pages/Diagnosis';
import ExportReport from '@/pages/ExportReport';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="import" element={<ImportCenter />} />
          <Route path="detail" element={<DetailQuery />} />
          <Route path="compare" element={<CompareAnalysis />} />
          <Route path="diagnosis" element={<Diagnosis />} />
          <Route path="export" element={<ExportReport />} />
        </Route>
      </Routes>
    </Router>
  );
}
