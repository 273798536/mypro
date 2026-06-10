import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Calculator from '@/pages/Calculator';
import Samples from '@/pages/Samples';
import QualityControl from '@/pages/QualityControl';
import Anomalies from '@/pages/Anomalies';
import Export from '@/pages/Export';
import { useAppStore } from '@/store/useAppStore';

export default function App() {
  const loadFromStorage = useAppStore((state) => state.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/quality-control" element={<QualityControl />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
