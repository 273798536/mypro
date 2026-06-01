import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ImportCenter } from './pages/ImportCenter';
import { BookingBoard } from './pages/BookingBoard';
import { BookingDetail } from './pages/BookingDetail';
import { ReviewCenter } from './pages/ReviewCenter';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/import" replace />} />
          <Route path="/import" element={<ImportCenter />} />
          <Route path="/board" element={<BookingBoard />} />
          <Route path="/booking/:id" element={<BookingDetail />} />
          <Route path="/review" element={<ReviewCenter />} />
          <Route path="*" element={<Navigate to="/import" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
