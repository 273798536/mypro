import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './components/MainLayout';
import SessionList from './pages/SessionList';
import SessionDetail from './pages/SessionDetail';
import ReportList from './pages/ReportList';
import GuideManagement from './pages/GuideManagement';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/sessions" />} />
        <Route path="sessions" element={<SessionList />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="reports" element={<ReportList />} />
        <Route path="guides" element={<GuideManagement />} />
      </Route>
    </Routes>
  );
}

export default App;
