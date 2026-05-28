import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import ResidualHome from '@/pages/ResidualHome';
import PendingArea from '@/pages/PendingArea';
import ImportCenter from '@/pages/ImportCenter';
import ExportCenter from '@/pages/ExportCenter';
import DetailEdit from '@/pages/DetailEdit';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<ResidualHome />} />
          <Route path="pending" element={<PendingArea />} />
          <Route path="import" element={<ImportCenter />} />
          <Route path="export" element={<ExportCenter />} />
          <Route path="detail/:id" element={<DetailEdit />} />
        </Route>
      </Routes>
    </Router>
  );
}
