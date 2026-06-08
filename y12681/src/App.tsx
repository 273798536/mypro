import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import SandboxList from '@/pages/SandboxList';
import SandboxDetail from '@/pages/SandboxDetail';
import SandboxEdit from '@/pages/SandboxEdit';
import SandboxHistory from '@/pages/SandboxHistory';
import SandboxCompare from '@/pages/SandboxCompare';
import { useSandboxStore } from '@/store/useSandboxStore';

export default function App() {
  const init = useSandboxStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SandboxList />} />
          <Route path="/create" element={<SandboxEdit />} />
          <Route path="/sandbox/:id" element={<SandboxDetail />} />
          <Route path="/sandbox/:id/edit" element={<SandboxEdit />} />
          <Route path="/sandbox/:id/history" element={<SandboxHistory />} />
          <Route path="/sandbox/:id/compare" element={<SandboxCompare />} />
          <Route path="*" element={<SandboxList />} />
        </Routes>
      </Layout>
    </Router>
  );
}
