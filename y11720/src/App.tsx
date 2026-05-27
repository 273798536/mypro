import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import CalculatorPage from './pages/CalculatorPage';
import ComparePage from './pages/ComparePage';
import ReportsPage from './pages/ReportsPage';
import ImportPage from './pages/ImportPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CalculatorPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Routes>
    </Layout>
  );
}
