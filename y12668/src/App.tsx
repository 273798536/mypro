import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import DetailLinkage from '@/pages/DetailLinkage';
import Timeline from '@/pages/Timeline';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/detail-linkage" replace />} />
          <Route path="detail-linkage" element={<DetailLinkage />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="*" element={<Navigate to="/detail-linkage" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
