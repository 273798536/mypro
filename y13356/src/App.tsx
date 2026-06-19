import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import SnapshotList from '@/pages/SnapshotList';
import SnapshotDetail from '@/pages/SnapshotDetail';
import ComparePage from '@/pages/ComparePage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SnapshotList />} />
          <Route path="/snapshot/:id" element={<SnapshotDetail />} />
          <Route path="/compare" element={<ComparePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
