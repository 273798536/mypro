import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Workbench from '@/pages/Workbench';
import ReportPreview from '@/pages/ReportPreview';
import { useCalcStore } from '@/store/useCalcStore';
import { useEffect } from 'react';

function App() {
  const loadMock = useCalcStore(s => s.loadMockData);
  useEffect(() => {
    const t = setTimeout(() => loadMock(), 600);
    return () => clearTimeout(t);
  }, [loadMock]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/report" element={<ReportPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
