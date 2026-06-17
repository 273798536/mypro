import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Workbench from '@/pages/Workbench';
import BatchDetail from '@/pages/BatchDetail';
import ReportCompare from '@/pages/ReportCompare';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workbench />} />
          <Route path="/batches/:id" element={<BatchDetail />} />
          <Route path="/batches/:id/report" element={<ReportCompare />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
