import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import AnnotationPage from './pages/AnnotationPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import StatisticsPage from './pages/StatisticsPage.jsx'
import TracePage from './pages/TracePage.jsx'
import ImportPage from './pages/ImportPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-title">🐟 斑马鱼胚胎标注</div>
          <ul className="sidebar-nav">
            <li>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                📋 阶段标注
              </NavLink>
            </li>
            <li>
              <NavLink to="/review" className={({ isActive }) => isActive ? 'active' : ''}>
                🔍 异常复核
              </NavLink>
            </li>
            <li>
              <NavLink to="/statistics" className={({ isActive }) => isActive ? 'active' : ''}>
                📊 分组统计
              </NavLink>
            </li>
            <li>
              <NavLink to="/trace" className={({ isActive }) => isActive ? 'active' : ''}>
                🔄 复盘溯源
              </NavLink>
            </li>
            <li>
              <NavLink to="/import" className={({ isActive }) => isActive ? 'active' : ''}>
                📥 数据导入
              </NavLink>
            </li>
          </ul>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<AnnotationPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/trace" element={<TracePage />} />
            <Route path="/import" element={<ImportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
