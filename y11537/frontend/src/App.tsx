import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import SiderMenu from './components/SiderMenu';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QueuePage from './pages/QueuePage';
import DataSubmissionPage from './pages/DataSubmissionPage';
import ReportsPage from './pages/ReportsPage';
import FailedRecordsPage from './pages/FailedRecordsPage';
import HrbpDashboard from './pages/HrbpDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const { Content } = Layout;

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <SiderMenu />
      <Layout>
        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/data" element={<DataSubmissionPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/failed-records" element={<FailedRecordsPage />} />
            <Route path="/hrbp-dashboard" element={<HrbpDashboard />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
