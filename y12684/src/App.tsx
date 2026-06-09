import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import DemoPage from './pages/DemoPage';
import ParamsPage from './pages/ParamsPage';
import MonitorPage from './pages/MonitorPage';
import ExportPage from './pages/ExportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/demo" replace />} />
          <Route path="demo" element={<DemoPage />} />
          <Route path="params" element={<ParamsPage />} />
          <Route path="monitor" element={<MonitorPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
