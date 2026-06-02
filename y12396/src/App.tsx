import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import PracticeList from '@/pages/PracticeList';
import PracticeDetail from '@/pages/PracticeDetail';
import PracticeEdit from '@/pages/PracticeEdit';
import PracticeHistory from '@/pages/PracticeHistory';
import PracticeReport from '@/pages/PracticeReport';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/practices" replace />} />
        <Route element={<Layout />}>
          <Route path="/practices" element={<PracticeList />} />
          <Route path="/practices/:id" element={<PracticeDetail />} />
          <Route path="/practices/:id/edit" element={<PracticeEdit />} />
          <Route path="/practices/:id/history" element={<PracticeHistory />} />
          <Route path="/practices/:id/report" element={<PracticeReport />} />
        </Route>
      </Routes>
    </Router>
  );
}
