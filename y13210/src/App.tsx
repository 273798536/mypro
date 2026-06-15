import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler } from 'chart.js';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ReviewDetail from '@/pages/ReviewDetail';
import FileManager from '@/pages/FileManager';
import ConfirmCenter from '@/pages/ConfirmCenter';
import ExportPage from '@/pages/ExportPage';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler
);

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="review" element={<ReviewDetail />} />
          <Route path="review/:songId" element={<ReviewDetail />} />
          <Route path="files" element={<FileManager />} />
          <Route path="files/:fileId" element={<FileManager />} />
          <Route path="confirm" element={<ConfirmCenter />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
