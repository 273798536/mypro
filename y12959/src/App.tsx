import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import DetailExplanationPanel from '@/components/DetailExplanationPanel';
import Dashboard from '@/pages/Dashboard';
import ConflictList from '@/pages/ConflictList';
import ConflictDetail from '@/pages/ConflictDetail';
import ResolveConflict from '@/pages/ResolveConflict';
import OperationHistory from '@/pages/OperationHistory';
import DownloadCenter from '@/pages/DownloadCenter';
import EmptyState from '@/components/EmptyState';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

function LayoutWithExplanation() {
  return (
    <Layout showExplanationPanel={true} explanationPanel={<DetailExplanationPanel />}>
      <Outlet />
    </Layout>
  );
}

function LayoutBasic() {
  return (
    <Layout showExplanationPanel={false}>
      <Outlet />
    </Layout>
  );
}

function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        variant="error"
        title="404 - 页面未找到"
        description="您访问的路由不存在，请检查地址或通过以下导航返回系统。"
        action={
          <>
            <Link to="/dashboard" className="btn-primary">
              <Home className="h-4 w-4" />
              返回总览
            </Link>
            <Link to="/conflicts" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              冲突列表
            </Link>
          </>
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<LayoutWithExplanation />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/conflicts" element={<ConflictList />} />
          <Route path="/conflicts/:id" element={<ConflictDetail />} />
          <Route path="/conflicts/:id/resolve" element={<ResolveConflict />} />
        </Route>

        <Route element={<LayoutBasic />}>
          <Route path="/history" element={<OperationHistory />} />
          <Route path="/downloads" element={<DownloadCenter />} />
        </Route>

        <Route element={<LayoutBasic />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
