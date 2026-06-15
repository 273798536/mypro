import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { usersAPI } from './api';
import { roleMap } from './utils';
import ComplaintList from './pages/ComplaintList';
import ComplaintDetail from './pages/ComplaintDetail';
import ExportPage from './pages/ExportPage';
import GuidePanel from './components/GuidePanel';

function App() {
  const [user, setUser] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    usersAPI.getCurrent().then(res => setUser(res.data));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>🚍 学校接送投诉回放系统</h1>
        <nav className="nav">
          <NavLink to="/complaints" className={({ isActive }) => isActive ? 'active' : ''}>
            投诉列表
          </NavLink>
          <NavLink to="/export" className={({ isActive }) => isActive ? 'active' : ''}>
            数据导出
          </NavLink>
          <a href="#" onClick={(e) => { e.preventDefault(); setShowGuide(!showGuide); }}>
            {showGuide ? '隐藏指引' : '操作指引'}
          </a>
        </nav>
        {user && (
          <div className="user-info">
            <span>👤 {user.name}</span>
            <span className="user-role">{roleMap[user.role]}</span>
          </div>
        )}
      </header>

      <main className="container">
        {showGuide && <GuidePanel onClose={() => setShowGuide(false)} />}

        <Routes>
          <Route path="/" element={<Navigate to="/complaints" replace />} />
          <Route path="/complaints" element={<ComplaintList />} />
          <Route path="/complaints/:id" element={<ComplaintDetail />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
