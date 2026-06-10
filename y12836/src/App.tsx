import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import SampleList from './pages/SampleList';
import SampleDetail from './pages/SampleDetail';
import Estimation from './pages/Estimation';
import Lineage from './pages/Lineage';
import Anomalies from './pages/Anomalies';
import NoteCompare from './pages/NoteCompare';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/samples" element={<SampleList />} />
          <Route path="/samples/:id" element={<SampleDetail />} />
          <Route path="/samples/:id/estimation" element={<Estimation />} />
          <Route path="/estimation" element={<Estimation />} />
          <Route path="/lineage" element={<Lineage />} />
          <Route path="/lineage/:sampleId" element={<Lineage />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/anomalies/duplicate/:barcode" element={<Anomalies />} />
          <Route path="/compare/notes" element={<NoteCompare />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
