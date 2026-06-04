import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import Workspace from '@/pages/Workspace';
import Samples from '@/pages/Samples';
import Rules from '@/pages/Rules';
import Export from '@/pages/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workspace />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
