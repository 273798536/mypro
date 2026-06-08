import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import Workbench from '@/pages/Workbench';
import RecordDetail from '@/pages/RecordDetail';
import ReimportTest from '@/pages/ReimportTest';

export default function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Workbench />} />
          <Route path="/record/:id" element={<RecordDetail />} />
          <Route path="/test/reimport" element={<ReimportTest />} />
          <Route path="*" element={<Workbench />} />
        </Routes>
      </AppShell>
    </Router>
  );
}
