import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BatchList from './pages/BatchList';
import BatchDetail from './pages/BatchDetail';
import CreateBatch from './pages/CreateBatch';
import DocumentList from './pages/DocumentList';
import DocumentDetail from './pages/DocumentDetail';
import ReviewList from './pages/ReviewList';
import ReviewDetail from './pages/ReviewDetail';
import TaskList from './pages/TaskList';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';
import AuditLog from './pages/AuditLog';
import DemoGuide from './pages/DemoGuide';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="batches" element={<BatchList />} />
          <Route path="batches/create" element={<CreateBatch />} />
          <Route path="batches/:id" element={<BatchDetail />} />
          <Route path="documents" element={<DocumentList />} />
          <Route path="documents/:id" element={<DocumentDetail />} />
          <Route path="review" element={<ReviewList />} />
          <Route path="review/:id" element={<ReviewDetail />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="reports" element={<ReportList />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="demo" element={<DemoGuide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
