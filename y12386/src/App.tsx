import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Checklist from '@/pages/Checklist';
import Detail from '@/pages/Detail';
import Import from '@/pages/Import';
import Export from '@/pages/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/check" element={<Checklist />} />
          <Route path="/detail/:id" element={<Detail />} />
          <Route path="/import" element={<Import />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
