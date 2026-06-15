import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import BayList from '@/pages/BayList';
import BayDetail from '@/pages/BayDetail';
import MaterialUpload from '@/pages/MaterialUpload';
import AnomalyCenter from '@/pages/AnomalyCenter';
import ExportCenter from '@/pages/ExportCenter';
import useBusBayStore from '@/store';

function StoreInitializer() {
  const initMockData = useBusBayStore((s) => s.initMockData);

  useEffect(() => {
    // 每次启动强制重置为 Mock 数据（演示环境使用，避免脏localStorage导致统计为0）
    initMockData();
  }, [initMockData]);

  return null;
}

export default function App() {
  return (
    <Router>
      <StoreInitializer />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bays" element={<BayList />} />
          <Route path="/bays/:bayId" element={<BayDetail />} />
          <Route path="/upload" element={<MaterialUpload />} />
          <Route path="/anomalies" element={<AnomalyCenter />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}
