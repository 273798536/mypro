import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LayerManagement } from '@/pages/LayerManagement';
import { ExceptionList } from '@/pages/ExceptionList';
import { ExceptionDetail } from '@/pages/ExceptionDetail';
import { ReviewManagement } from '@/pages/ReviewManagement';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LayerManagement />} />
        <Route path="exceptions" element={<ExceptionList />} />
        <Route path="exceptions/:id" element={<ExceptionDetail />} />
        <Route path="review" element={<ReviewManagement />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
