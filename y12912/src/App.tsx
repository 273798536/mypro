import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { BatchWorkbenchPage } from './pages/BatchWorkbenchPage';
import { AnomalyDetailPage } from './pages/AnomalyDetailPage';
import { ExportPage } from './pages/ExportPage';
import { useWorkflowStore } from './store';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initMockData, batches } = useWorkflowStore();

  useEffect(() => {
    if (batches.length === 0) {
      initMockData();
    }
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950">
      <Sidebar onNavigate={navigate} currentPath={location.pathname} />
      <Routes>
        <Route path="/" element={<HomePage onNavigate={navigate} />} />
        <Route path="/batch/:batchId" element={<BatchWorkbenchPage onNavigate={navigate} />} />
        <Route path="/batch/:batchId/anomaly/:anomalyId" element={<AnomalyDetailPage onNavigate={navigate} />} />
        <Route path="/batch/:batchId/export" element={<ExportPage onNavigate={navigate} />} />
        <Route path="*" element={<HomePage onNavigate={navigate} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
