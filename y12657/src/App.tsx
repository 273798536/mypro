import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import InspectionList from '@/pages/InspectionList';
import InspectionDetail from '@/pages/InspectionDetail';
import InspectionRevise from '@/pages/InspectionRevise';
import InspectionHistory from '@/pages/InspectionHistory';
import Docs from '@/pages/Docs';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/inspections" replace />} />
          <Route path="inspections" element={<InspectionList />} />
          <Route path="inspections/:id" element={<InspectionDetail />} />
          <Route path="inspections/:id/revise" element={<InspectionRevise />} />
          <Route path="inspections/:id/history" element={<InspectionHistory />} />
          <Route path="docs" element={<Docs />} />
        </Route>
      </Routes>
    </Router>
  );
}
