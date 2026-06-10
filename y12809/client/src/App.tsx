import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SampleList from './pages/SampleList';
import SampleDetail from './pages/SampleDetail';
import BatchAnalysis from './pages/BatchAnalysis';
import MonthlyHandover from './pages/MonthlyHandover';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/samples" element={<SampleList />} />
        <Route path="/samples/:id" element={<SampleDetail />} />
        <Route path="/batches" element={<BatchAnalysis />} />
        <Route path="/handover" element={<MonthlyHandover />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
