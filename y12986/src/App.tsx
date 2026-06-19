import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { TaskListPage } from './pages/TaskList';
import { ExceptionDetailPage } from './pages/ExceptionDetail';
import { PermissionAuditPage } from './pages/PermissionAudit';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<TaskListPage />} />
            <Route path="/task/:taskId/record/:recordId" element={<ExceptionDetailPage />} />
            <Route path="/audit" element={<PermissionAuditPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  );
}
