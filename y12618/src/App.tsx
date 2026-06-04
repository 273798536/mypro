import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useStore } from '@/store';
import Layout from '@/components/Layout';
import LevelList from '@/pages/LevelList';
import LevelDetail from '@/pages/LevelDetail';
import LevelEdit from '@/pages/LevelEdit';
import History from '@/pages/History';
import Export from '@/pages/Export';

export default function App() {
  const { seedData, seeded } = useStore();

  useEffect(() => {
    if (!seeded) {
      seedData();
    }
  }, [seeded, seedData]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LevelList />} />
          <Route path="/level/:id" element={<LevelDetail />} />
          <Route path="/level/:id/edit" element={<LevelEdit />} />
          <Route path="/history" element={<History />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </Layout>
    </Router>
  );
}
