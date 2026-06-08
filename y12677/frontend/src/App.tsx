import { Routes, Route } from 'react-router-dom';
import RecordListPage from './pages/RecordListPage';
import RecordDetailPage from './pages/RecordDetailPage';
import CorrectPage from './pages/CorrectPage';
import HistoryPage from './pages/HistoryPage';
import Layout from './components/Layout';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RecordListPage />} />
        <Route path="/record/:id" element={<RecordDetailPage />} />
        <Route path="/record/:id/correct" element={<CorrectPage />} />
        <Route path="/record/:id/history" element={<HistoryPage />} />
      </Routes>
    </Layout>
  );
}
