import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import RecordDetail from '@/pages/RecordDetail';
import RecordEdit from '@/pages/RecordEdit';
import ReportCenter from '@/pages/ReportCenter';
import SampleShowcase from '@/pages/SampleShowcase';

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/records/new" element={<RecordEdit />} />
          <Route path="/records/:id/edit" element={<RecordEdit />} />
          <Route path="/reports" element={<ReportCenter />} />
          <Route path="/samples" element={<SampleShowcase />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
