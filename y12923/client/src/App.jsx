import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import BatchDetail from './pages/BatchDetail.jsx';
import Rules from './pages/Rules.jsx';
import ManualCorrect from './pages/ManualCorrect.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>敏感词规则回归测试工具</h1>
        <nav>
          <NavLink to="/batches" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            批次管理
          </NavLink>
          <NavLink to="/manual" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            人工修正
          </NavLink>
          <NavLink to="/rules" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            安全规则
          </NavLink>
        </nav>
      </header>
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/batches" replace />} />
          <Route path="/batches" element={<Dashboard />} />
          <Route path="/batches/:batchId" element={<BatchDetail />} />
          <Route path="/manual" element={<ManualCorrect />} />
          <Route path="/rules" element={<Rules />} />
        </Routes>
      </div>
    </div>
  );
}
