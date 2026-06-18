import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChangeListPage } from './pages/ChangeListPage';
import { ChangeDetailPage } from './pages/ChangeDetailPage';
import { SchemaComparePage } from './pages/SchemaComparePage';
import { PermissionPage } from './pages/PermissionPage';
import { ImportTestPage } from './pages/ImportTestPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ChangeListPage />} />
          <Route path="/changes/:id" element={<ChangeDetailPage />} />
          <Route path="/schema-compare" element={<SchemaComparePage />} />
          <Route path="/permissions" element={<PermissionPage />} />
          <Route path="/import-test" element={<ImportTestPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
