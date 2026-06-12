import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Review from '@/pages/Review';
import MapView from '@/pages/MapView';
import LogEntry from '@/pages/LogEntry';
import ExportReport from '@/pages/ExportReport';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/review" element={<Review />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/log" element={<LogEntry />} />
          <Route path="/export" element={<ExportReport />} />
        </Route>
      </Routes>
    </Router>
  );
}
