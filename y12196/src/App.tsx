import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { BoxList } from '@/pages/BoxList';
import { BoxDetail } from '@/pages/BoxDetail';
import { CityList } from '@/pages/CityList';
import { CityDetail } from '@/pages/CityDetail';
import { ConflictCenter } from '@/pages/ConflictCenter';
import { AlertCenter } from '@/pages/AlertCenter';
import { ReportPage } from '@/pages/ReportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/boxes" element={<BoxList />} />
          <Route path="/boxes/:id" element={<BoxDetail />} />
          <Route path="/cities" element={<CityList />} />
          <Route path="/cities/:id" element={<CityDetail />} />
          <Route path="/conflicts" element={<ConflictCenter />} />
          <Route path="/alerts" element={<AlertCenter />} />
          <Route path="/reports" element={<ReportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
