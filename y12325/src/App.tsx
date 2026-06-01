import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Workspace from '@/pages/Workspace';
import Batch from '@/pages/Batch';
import History from '@/pages/History';
import Samples from '@/pages/Samples';
import Export from '@/pages/Export';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/batch" element={<Batch />} />
        <Route path="/history" element={<History />} />
        <Route path="/samples" element={<Samples />} />
        <Route path="/export" element={<Export />} />
      </Routes>
    </Layout>
  );
}
