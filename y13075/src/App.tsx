import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Overview from '@/pages/Overview';
import SensorRecords from '@/pages/SensorRecords';
import AnomalyDetail from '@/pages/AnomalyDetail';
import ReportExport from '@/pages/ReportExport';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/sensors" element={<SensorRecords />} />
          <Route path="/anomaly/:id" element={<AnomalyDetail />} />
          <Route path="/export" element={<ReportExport />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
