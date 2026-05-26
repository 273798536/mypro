import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import LoanList from './pages/LoanList';
import LoanDetail from './pages/LoanDetail';
import ImportPage from './pages/ImportPage';
import ExportPage from './pages/ExportPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/loans" element={<LoanList />} />
        <Route path="/loans/:id" element={<LoanDetail />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
