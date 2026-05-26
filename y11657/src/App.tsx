import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Materials from '@/pages/Materials';
import Scheduler from '@/pages/Scheduler';
import Result from '@/pages/Result';
import Report from '@/pages/Report';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/materials" replace />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/result" element={<Result />} />
          <Route path="/report" element={<Report />} />
          <Route path="*" element={<Navigate to="/materials" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
